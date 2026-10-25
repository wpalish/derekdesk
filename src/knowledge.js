import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const LOCALES = new Set(['ru', 'kk']);
const AUDIENCES = new Set(['public', 'staff']);
const APPLICATION_ID = 0x44524b44;
const copy = value => structuredClone(value);
const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');

function text(value, label, min = 1, max = 4000) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new Error(`${label}: допустимо ${min}–${max} символов.`);
  }
  return value.trim();
}

function date(value) {
  const number = Date.parse(value);
  if (!Number.isFinite(number)) throw new Error('Нужна корректная дата.');
  return new Date(number).toISOString();
}

function sourceUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Нужна ссылка http(s) без встроенных учётных данных.');
  }
  return url.href;
}

function localContent(value, required = false) {
  if (!value && !required) return null;
  if (!value || !Array.isArray(value.aliases) || value.aliases.length < 1 || value.aliases.length > 30) {
    throw new Error('Укажите 1–30 формулировок вопроса для каждого заполненного языка.');
  }
  const aliases = value.aliases.map(alias => text(alias, 'Формулировка', 3, 180));
  if (aliases.some(alias => normalize(alias).length < 3)) throw new Error('Формулировка должна содержать слова, а не только знаки.');
  if (new Set(aliases.map(normalize)).size !== aliases.length) throw new Error('Формулировки должны различаться.');
  return {title: text(value.title, 'Заголовок', 3, 200), answer: text(value.answer, 'Ответ', 3, 5000), aliases};
}

export function makeArticle(input, now = new Date().toISOString()) {
  if (!input || !AUDIENCES.has(input.audience)) throw new Error('Выберите public или staff.');
  const verifiedAt = date(input.source?.verifiedAt), validUntil = date(input.source?.validUntil);
  if (verifiedAt > validUntil) throw new Error('Срок актуальности не может закончиться раньше проверки.');
  if (verifiedAt > date(now)) throw new Error('Дата проверки не может быть в будущем.');
  const ru = localContent(input.ru), kk = localContent(input.kk);
  if (!ru && !kk) throw new Error('Заполните хотя бы один язык.');
  return {
    id: randomUUID(), version: 1, status: 'draft', audience: input.audience,
    ru, kk,
    source: {title: text(input.source?.title, 'Название источника', 1, 300),
      url: sourceUrl(input.source?.url), excerpt: text(input.source?.excerpt, 'Фрагмент источника', 3, 12000), verifiedAt, validUntil},
    createdAt: date(now), updatedAt: date(now), approvedAt: null, approvedBy: null
  };
}

function matching(article, locale, query) {
  if (!article[locale]) return false;
  const question = ` ${normalize(query)} `;
  return article[locale].aliases.some(alias => question.includes(` ${normalize(alias)} `));
}

function checkArticleVersion(article, expectedVersion) {
  if (expectedVersion === undefined) return;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new Error('Укажите целую положительную версию материала.');
  }
  if (article.version !== expectedVersion) {
    const error = new Error('Материал изменился в другой вкладке. Сохраните введённый текст отдельно, обновите список и проверьте текущую версию.');
    error.status = 409;
    throw error;
  }
}

export class KnowledgeDesk {
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    const appId = this.db.prepare('PRAGMA application_id').get().application_id;
    const version = this.db.prepare('PRAGMA user_version').get().user_version;
    const objects = this.db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").get().count;
    const empty = appId === 0 && version === 0 && objects === 0;
    if (!empty && (appId !== APPLICATION_ID || version !== 1)) {
      this.db.close();
      throw new Error('Неизвестная база или неподдерживаемая версия схемы. Файл не изменён.');
    }
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS articles (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, aggregate_id TEXT NOT NULL, kind TEXT NOT NULL, at TEXT NOT NULL, actor TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS events_aggregate ON events(aggregate_id);
      PRAGMA user_version=1;
      PRAGMA application_id=${APPLICATION_ID};
    `);
  }

  close() { this.db.close(); }

  _transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  _event(aggregateId, kind, at, actor) {
    this.db.prepare('INSERT INTO events VALUES (?, ?, ?, ?, ?)')
      .run(randomUUID(), aggregateId, kind, date(at), text(actor, 'Автор действия', 1, 120));
  }

  _article(id) {
    const row = this.db.prepare('SELECT payload FROM articles WHERE id = ?').get(id);
    if (!row) throw new Error('Материал не найден.');
    return JSON.parse(row.payload);
  }

  _writeArticle(article) {
    this.db.prepare('INSERT INTO articles(id,payload) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload')
      .run(article.id, JSON.stringify(article));
  }

  listArticles() {
    return this.db.prepare('SELECT payload FROM articles ORDER BY rowid').all().map(row => JSON.parse(row.payload));
  }

  createArticle(input, actor, now = new Date().toISOString()) {
    const article = makeArticle(input, now);
    return this._transaction(() => {
      this._writeArticle(article); this._event(article.id, 'article.created', now, actor); return copy(article);
    });
  }

  importArticles(inputs, actor, now = new Date().toISOString()) {
    if (!Array.isArray(inputs) || !inputs.length || inputs.length > 500) throw new Error('Импортируйте 1–500 материалов.');
    const articles = inputs.map(input => makeArticle(input, now));
    return this._transaction(() => {
      for (const article of articles) {
        this._writeArticle(article); this._event(article.id, 'article.imported_as_draft', now, actor);
      }
      return copy(articles);
    });
  }

  approveArticle(id, actor, now = new Date().toISOString(), expectedVersion) {
    return this._transaction(() => {
      const article = this._article(id);
      checkArticleVersion(article, expectedVersion);
      if (article.source.validUntil <= date(now)) throw new Error('Истёк срок актуальности. Обновите источник перед одобрением.');
      article.status = 'approved'; article.approvedAt = date(now); article.approvedBy = text(actor, 'Проверил', 1, 120);
      article.updatedAt = date(now); this._writeArticle(article); this._event(id, 'article.approved', now, actor);
      return copy(article);
    });
  }

  editArticle(id, input, actor, now = new Date().toISOString()) {
    return this._transaction(() => {
      const current = this._article(id);
      checkArticleVersion(current, input?.expectedVersion);
      const updated = makeArticle(input, now);
      Object.assign(updated, {id: current.id, version: current.version + 1, createdAt: current.createdAt});
      this._writeArticle(updated); this._event(id, 'article.edited_approval_reset', now, actor); return copy(updated);
    });
  }

  ask({question, locale, audience = 'public'}, now = new Date().toISOString()) {
    if (!LOCALES.has(locale) || !AUDIENCES.has(audience)) throw new Error('Выберите допустимый язык и канал.');
    const input = text(question, 'Вопрос', 3, 2000), at = date(now);
    if (normalize(input).length < 3) throw new Error('Вопрос должен содержать слова, а не только знаки.');
    const visible = this.listArticles().filter(article => article.status === 'approved'
      && (audience === 'staff' || article.audience === 'public') && article.source.validUntil > at);
    const matches = visible.filter(article => matching(article, locale, input));
    const missingLocale = !matches.length && visible.some(article => !article[locale]
      && [...LOCALES].some(other => other !== locale && matching(article, other, input)));
    const match = matches.length === 1 ? matches[0] : null;
    const reason = match ? null : matches.length > 1 ? 'ambiguous' : missingLocale ? 'translation_missing' : 'no_approved_answer';
    const item = {
      id: randomUUID(), question: input, locale, audience, createdAt: at, status: match ? 'answered' : 'open',
      resolution: null, handoffReason: reason,
      answer: match ? {text: match[locale].answer, articleId: match.id, version: match.version,
        locale, source: copy(match.source), articleSnapshot: copy(match)} : null
    };
    return this._transaction(() => {
      this.db.prepare('INSERT INTO cases VALUES (?,?)').run(item.id, JSON.stringify(item));
      this._event(item.id, match ? 'question.answered_from_approved_article' : 'question.queued', at, audience === 'public' ? 'visitor' : 'staff');
      return copy(item);
    });
  }

  getCase(id) {
    const row = this.db.prepare('SELECT payload FROM cases WHERE id = ?').get(id);
    if (!row) throw new Error('Обращение не найдено.');
    return JSON.parse(row.payload);
  }

  listOpenCases() {
    return this.db.prepare('SELECT payload FROM cases ORDER BY rowid').all()
      .map(row => JSON.parse(row.payload)).filter(item => item.status === 'open');
  }

  requestHuman(id, now = new Date().toISOString()) {
    const item = this.getCase(id);
    if (item.status === 'resolved') throw new Error('Обращение закрыто. Создайте новый вопрос.');
    return this._transaction(() => {
      item.status = 'open'; item.handoffReason = 'requested_by_user';
      this.db.prepare('UPDATE cases SET payload=? WHERE id=?').run(JSON.stringify(item), id);
      this._event(id, 'question.human_requested', now, 'visitor'); return copy(item);
    });
  }

  resolveCase(id, reply, actor, now = new Date().toISOString()) {
    const item = this.getCase(id);
    if (item.status !== 'open') throw new Error('Ответ сотрудника возможен только для открытого обращения.');
    const resolution = {text: text(reply, 'Ответ сотрудника', 3, 5000), actor: text(actor, 'Сотрудник', 1, 120), at: date(now)};
    return this._transaction(() => {
      item.status = 'resolved'; item.resolution = resolution;
      this.db.prepare('UPDATE cases SET payload=? WHERE id=?').run(JSON.stringify(item), id);
      this._event(id, 'question.resolved_by_operator', now, actor); return copy(item);
    });
  }

  audit(aggregateId) {
    return this.db.prepare('SELECT kind,at,actor FROM events WHERE aggregate_id=? ORDER BY rowid').all(aggregateId);
  }
}
