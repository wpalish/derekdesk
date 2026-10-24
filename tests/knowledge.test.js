import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { KnowledgeDesk, makeArticle } from "../src/knowledge.js";

const NOW = "2026-10-24T12:00:00.000Z";
const LATER = "2026-11-25T12:00:00.000Z";
function fixture(overrides = {}) {
  return {
    audience: "public",
    ru: {
      title: "Пробное занятие",
      answer: "В учебном примере время подтверждает администратор.",
      aliases: ["пробный урок", "пробное занятие"],
    },
    kk: {
      title: "Сынақ сабағы",
      answer: "Оқу мысалында сабақ уақытын әкімші растайды.",
      aliases: ["сынақ сабағы", "сынақ сабағына"],
    },
    source: {
      title: "Синтетический регламент",
      url: "https://example.org/policy",
      excerpt:
        "Это вымышленный материал для теста: администратор подтверждает время.",
      verifiedAt: NOW,
      validUntil: "2026-11-24T12:00:00.000Z",
    },
    ...overrides,
  };
}
function approved(desk, input = fixture()) {
  const article = desk.createArticle(input, "test-owner", NOW);
  return desk.approveArticle(article.id, "test-owner", NOW);
}
function withDesk(fn) {
  const desk = new KnowledgeDesk();
  try {
    fn(desk);
  } finally {
    desk.close();
  }
}

test("draft knowledge never answers a visitor; the question enters the operator queue", () =>
  withDesk((desk) => {
    desk.createArticle(fixture(), "test-owner", NOW);
    const result = desk.ask(
      { question: "Как проходит пробный урок?", locale: "ru" },
      NOW,
    );
    assert.equal(result.answer, null);
    assert.equal(result.status, "open");
    assert.equal(desk.listOpenCases().length, 1);
  }));

test("RU and KK return the exact approved text and its source, not generated claims", () =>
  withDesk((desk) => {
    const article = approved(desk);
    for (const [locale, question] of [
      ["ru", "Как проходит ПРОБНЫЙ УРОК?"],
      ["kk", "Сынақ сабағына қалай жазылуға болады?"],
    ]) {
      const result = desk.ask({ question, locale }, NOW);
      assert.equal(result.status, "answered");
      assert.equal(result.answer.text, article[locale].answer);
      assert.deepEqual(result.answer.source, article.source);
      assert.equal(result.answer.version, 1);
    }
  }));

test("a missing translation routes to a person rather than inventing translated policy", () =>
  withDesk((desk) => {
    approved(desk, fixture({ kk: null }));
    const result = desk.ask({ question: "пробный урок", locale: "kk" }, NOW);
    assert.equal(result.answer, null);
    assert.equal(result.handoffReason, "translation_missing");
  }));

test("expired material is excluded and cannot be approved without a new review", () =>
  withDesk((desk) => {
    const article = approved(desk);
    const result = desk.ask({ question: "пробный урок", locale: "ru" }, LATER);
    assert.equal(result.answer, null);
    assert.throws(
      () => desk.approveArticle(article.id, "test-owner", LATER),
      /Истёк/,
    );
  }));

test("an edit revokes approval and preserves the old answer and evidence snapshot", () =>
  withDesk((desk) => {
    const original = approved(desk);
    const attempt = desk.ask({ question: "пробный урок", locale: "ru" }, NOW);
    const input = fixture();
    input.ru.answer = "Вторая вымышленная редакция регламента.";
    const changed = desk.editArticle(original.id, input, "test-owner", NOW);
    assert.equal(changed.version, 2);
    assert.equal(changed.status, "draft");
    assert.equal(
      desk.ask({ question: "пробный урок", locale: "ru" }, NOW).answer,
      null,
    );
    assert.equal(desk.getCase(attempt.id).answer.text, original.ru.answer);
    assert.equal(desk.getCase(attempt.id).answer.articleSnapshot.version, 1);
  }));

test("staff-only content never enters public retrieval", () =>
  withDesk((desk) => {
    const article = approved(desk, fixture({ audience: "staff" }));
    const publicCase = desk.ask(
      { question: "пробный урок", locale: "ru", audience: "public" },
      NOW,
    );
    assert.equal(publicCase.answer, null);
    assert.equal(
      desk.ask(
        { question: "пробный урок", locale: "ru", audience: "staff" },
        NOW,
      ).answer.articleId,
      article.id,
    );
    // This is a domain-scope check. HTTP authentication is deliberately not claimed.
  }));

test("two matching approved answers cause a visible handoff rather than an arbitrary winner", () =>
  withDesk((desk) => {
    approved(desk);
    approved(desk);
    const result = desk.ask({ question: "пробный урок", locale: "ru" }, NOW);
    assert.equal(result.answer, null);
    assert.equal(result.handoffReason, "ambiguous");
  }));

test("a visitor can request a person after a found answer; resolution records who replied", () =>
  withDesk((desk) => {
    approved(desk);
    const answer = desk.ask({ question: "пробный урок", locale: "ru" }, NOW);
    const queued = desk.requestHuman(answer.id, NOW);
    assert.equal(queued.status, "open");
    assert.ok(queued.answer);
    const resolved = desk.resolveCase(
      answer.id,
      "Синтетический ответ оператора.",
      "test-operator",
      NOW,
    );
    assert.equal(resolved.status, "resolved");
    assert.equal(resolved.resolution.actor, "test-operator");
    assert.equal(desk.listOpenCases().length, 0);
    assert.deepEqual(
      desk.audit(answer.id).map((event) => event.kind),
      [
        "question.answered_from_approved_article",
        "question.human_requested",
        "question.resolved_by_operator",
      ],
    );
    assert.throws(
      () =>
        desk.resolveCase(answer.id, "Ещё один ответ.", "test-operator", NOW),
      /открытого/,
    );
  }));

test("invalid batch imports make no partial changes and imported approval cannot bypass review", () =>
  withDesk((desk) => {
    assert.throws(() =>
      desk.importArticles(
        [fixture(), fixture({ source: null })],
        "test-owner",
        NOW,
      ),
    );
    assert.equal(desk.listArticles().length, 0);
    const imported = desk.importArticles(
      [fixture({ status: "approved" })],
      "test-owner",
      NOW,
    );
    assert.equal(imported[0].status, "draft");
  }));

test("closing and reopening a file database preserves approved evidence and queued cases", () => {
  const folder = mkdtempSync(join(tmpdir(), "derekdesk-test-"));
  const path = join(folder, "test.sqlite");
  let desk;
  try {
    desk = new KnowledgeDesk(path);
    const article = approved(desk);
    const question = desk.ask(
      { question: "Неизвестный вопрос про гарантию", locale: "ru" },
      NOW,
    );
    desk.close();
    desk = new KnowledgeDesk(path);
    assert.equal(desk.listArticles()[0].id, article.id);
    assert.equal(desk.getCase(question.id).status, "open");
    assert.equal(desk.listOpenCases().length, 1);
  } finally {
    desk?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});

test("unsafe source links, future verification, and meaningless aliases are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "https://user:password@example.org/policy",
  ]) {
    const input = fixture();
    input.source.url = url;
    assert.throws(() => makeArticle(input, NOW));
  }
  const future = fixture();
  future.source.verifiedAt = "2026-10-25T12:00:00.000Z";
  assert.throws(() => makeArticle(future, NOW), /будущем/);
  const punctuation = fixture();
  punctuation.ru.aliases = ["!!!"];
  assert.throws(() => makeArticle(punctuation, NOW), /знаки/);
});

test("an unrelated SQLite database is rejected without changing its contents", () => {
  const folder = mkdtempSync(join(tmpdir(), "derekdesk-foreign-"));
  const path = join(folder, "foreign.sqlite");
  let foreign;
  try {
    foreign = new DatabaseSync(path);
    foreign.exec(
      "CREATE TABLE important(payload TEXT); INSERT INTO important VALUES ('keep me'); PRAGMA user_version=8;",
    );
    foreign.close();
    foreign = null;
    assert.throws(() => new KnowledgeDesk(path), /Файл не изменён/);
    foreign = new DatabaseSync(path);
    assert.equal(
      foreign.prepare("SELECT payload FROM important").get().payload,
      "keep me",
    );
    assert.equal(foreign.prepare("PRAGMA user_version").get().user_version, 8);
  } finally {
    foreign?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});

test("a future DerekDesk schema is rejected rather than silently downgraded", () => {
  const folder = mkdtempSync(join(tmpdir(), "derekdesk-future-"));
  const path = join(folder, "future.sqlite");
  let connection;
  try {
    const original = new KnowledgeDesk(path);
    approved(original);
    original.close();
    connection = new DatabaseSync(path);
    connection.exec("PRAGMA user_version=2");
    connection.close();
    connection = null;
    assert.throws(() => new KnowledgeDesk(path), /неподдерживаемая/);
    connection = new DatabaseSync(path);
    assert.equal(
      connection.prepare("PRAGMA user_version").get().user_version,
      2,
    );
    assert.equal(
      connection.prepare("SELECT count(*) AS count FROM articles").get().count,
      1,
    );
  } finally {
    connection?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
