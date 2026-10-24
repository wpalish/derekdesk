import http from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { KnowledgeDesk, makeArticle } from "./knowledge.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("hex");
const failure = (status, message) =>
  Object.assign(new Error(message), { status });
function passwordHash(password) {
  if (
    typeof password !== "string" ||
    password.length < 14 ||
    password.length > 200
  )
    throw failure(400, "Пароль: 14–200 символов.");
  const salt = token();
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, encoded) {
  if (typeof password !== "string" || password.length > 200) return false;
  const [salt, value] = encoded.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(value, "hex"),
  );
}
const cookieValue = (req) =>
  (req.headers.cookie || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("desk_session="))
    ?.slice(13) || "";
async function jsonBody(req) {
  let size = 0,
    chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 262144) throw failure(413, "Запрос слишком большой.");
    chunks.push(chunk);
  }
  if (!(req.headers["content-type"] || "").startsWith("application/json"))
    throw failure(415, "Нужен JSON.");
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value;
  } catch {
    throw failure(400, "Некорректный JSON.");
  }
}

export function createDeskServer({
  database = ":memory:",
  origin = null,
  admin,
  now = () => Date.now(),
} = {}) {
  if (database !== ":memory:")
    mkdirSync(dirname(database), { recursive: true });
  const desk = new KnowledgeDesk(database),
    db = desk.db;
  db.exec(`CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, password TEXT NOT NULL, role TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (digest TEXT PRIMARY KEY, username TEXT NOT NULL, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS case_access (case_id TEXT PRIMARY KEY, digest TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, since INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS disabled_users (username TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS access_events (id TEXT PRIMARY KEY, username TEXT NOT NULL, actor TEXT NOT NULL, enabled INTEGER NOT NULL, at TEXT NOT NULL);`);
  function addUser({ username, password, role = "operator" }) {
    if (
      typeof username !== "string" ||
      !/^[a-zA-Z0-9_.-]{3,80}$/.test(username) ||
      !["operator", "admin"].includes(role)
    )
      throw failure(
        400,
        "Нужны имя 3–80 латинских знаков и роль operator/admin.",
      );
    db.prepare("INSERT INTO users VALUES (?,?,?)").run(
      username,
      passwordHash(password),
      role,
    );
    return { username, role };
  }
  if (admin && !db.prepare("SELECT name FROM users LIMIT 1").get())
    addUser({ ...admin, role: "admin" });
  function session(req) {
    return db
      .prepare(
        "SELECT s.username,s.csrf,u.role FROM sessions s JOIN users u ON u.name=s.username WHERE s.digest=? AND s.expires>? AND NOT EXISTS(SELECT 1 FROM disabled_users d WHERE d.username=u.name)",
      )
      .get(hash(cookieValue(req)), now());
  }
  function authorize(req, role) {
    const user = session(req);
    if (!user) throw failure(401, "Войдите в кабинет.");
    if (role === "admin" && user.role !== "admin")
      throw failure(403, "Нужна роль администратора.");
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.headers["x-csrf-token"] !== user.csrf
    )
      throw failure(403, "Обновите страницу: не подтверждён запрос.");
    return user;
  }
  const publicCase = (item) => ({
    id: item.id,
    question: item.question,
    locale: item.locale,
    status: item.status,
    createdAt: item.createdAt,
    handoffReason: item.handoffReason,
    resolution: item.resolution
      ? {
          text: item.resolution.text,
          at: item.resolution.at,
          actor: "Сотрудник",
        }
      : null,
    answer: item.answer
      ? {
          text: item.answer.text,
          version: item.answer.version,
          source: item.answer.source,
        }
      : null,
  });
  function visitorCase(req, id) {
    const entry = db
      .prepare("SELECT digest FROM case_access WHERE case_id=?")
      .get(id);
    const proof = req.headers["x-case-token"];
    if (!entry || typeof proof !== "string" || hash(proof) !== entry.digest)
      throw failure(404, "Обращение не найдено или нет доступа.");
    return desk.getCase(id);
  }
  const counts = new Map();
  function limited(key, limit, window = 60000) {
    const current = counts.get(key);
    const value =
      !current || now() - current.since >= window
        ? { since: now(), count: 0 }
        : current;
    value.count++;
    counts.set(key, value);
    if (counts.size > 10000)
      for (const [k, v] of counts)
        if (now() - v.since > window) counts.delete(k);
    if (value.count > limit)
      throw failure(429, "Слишком много запросов. Попробуйте позже.");
  }
  function send(res, status, value, headers = {}) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    });
    res.end(JSON.stringify(value));
  }
  const server = http.createServer(async (req, res) => {
    const headers = {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    };
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    try {
      const allowedOrigin =
        origin || `http://127.0.0.1:${server.address().port}`;
      const url = new URL(req.url, allowedOrigin),
        route = url.pathname,
        method = req.method;
      if (req.headers.host !== new URL(allowedOrigin).host)
        throw failure(400, "Неизвестный адрес сервера.");
      if (
        !["GET", "HEAD"].includes(method) &&
        req.headers.origin !== allowedOrigin
      )
        throw failure(403, "Запрос должен исходить из этого приложения.");
      limited(req.socket.remoteAddress || "local", 240);
      if (method === "GET" && route === "/api/health")
        return send(res, 200, { status: "ok", product: "DerekDesk" });
      if (method === "GET" && route === "/api/session")
        return send(res, 200, { user: session(req) || null });
      if (method === "POST" && route === "/api/login") {
        const body = await jsonBody(req),
          key = hash(`${req.socket.remoteAddress}:${body.username}`);
        const previous = db
          .prepare("SELECT * FROM login_attempts WHERE key=?")
          .get(key);
        if (
          previous &&
          now() - previous.since < 900000 &&
          previous.attempts >= 5
        )
          throw failure(429, "Пять неудачных попыток. Подождите 15 минут.");
        const user =
          typeof body.username === "string"
            ? db.prepare("SELECT * FROM users WHERE name=?").get(body.username)
            : null;
        if (
          !user ||
          db
            .prepare("SELECT 1 FROM disabled_users WHERE username=?")
            .get(user.name) ||
          !verifyPassword(body.password, user.password)
        ) {
          const recent = previous && now() - previous.since < 900000;
          db.prepare(
            "INSERT INTO login_attempts VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET attempts=excluded.attempts,since=excluded.since",
          ).run(
            key,
            recent ? previous.attempts + 1 : 1,
            recent ? previous.since : now(),
          );
          throw failure(401, "Не удалось войти. Проверьте имя и пароль.");
        }
        db.prepare("DELETE FROM login_attempts WHERE key=?").run(key);
        db.prepare("DELETE FROM sessions WHERE expires<=?").run(now());
        const secret = token(),
          csrf = token();
        db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(
          hash(secret),
          user.name,
          csrf,
          now() + 8 * 3600000,
        );
        return send(
          res,
          200,
          { user: { username: user.name, role: user.role, csrf } },
          {
            "Set-Cookie": `desk_session=${secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${allowedOrigin.startsWith("https:") ? "; Secure" : ""}`,
          },
        );
      }
      if (method === "POST" && route === "/api/logout") {
        authorize(req);
        db.prepare("DELETE FROM sessions WHERE digest=?").run(
          hash(cookieValue(req)),
        );
        return send(
          res,
          200,
          { ok: true },
          {
            "Set-Cookie":
              "desk_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
          },
        );
      }
      if (method === "POST" && route === "/api/users") {
        authorize(req, "admin");
        return send(res, 201, addUser(await jsonBody(req)));
      }
      if (method === "GET" && route === "/api/users") {
        authorize(req, "admin");
        const users = db
          .prepare(
            "SELECT u.name username,u.role,NOT EXISTS(SELECT 1 FROM disabled_users d WHERE d.username=u.name) enabled FROM users u ORDER BY u.name",
          )
          .all()
          .map((u) => ({ ...u, enabled: !!u.enabled }));
        return send(res, 200, { users });
      }
      const access = route.match(
        /^\/api\/users\/([a-zA-Z0-9_.-]{3,80})\/access$/,
      );
      if (access && method === "POST") {
        const actor = authorize(req, "admin"),
          body = await jsonBody(req);
        if (typeof body.enabled !== "boolean")
          throw failure(400, "Укажите, разрешён ли вход.");
        const target = db
          .prepare("SELECT name,role FROM users WHERE name=?")
          .get(access[1]);
        if (!target) throw failure(404, "Оператор не найден.");
        if (target.role !== "operator")
          throw failure(400, "Здесь можно изменять только доступ операторов.");
        db.exec("BEGIN IMMEDIATE");
        try {
          if (body.enabled)
            db.prepare("DELETE FROM disabled_users WHERE username=?").run(
              target.name,
            );
          else {
            db.prepare("INSERT OR IGNORE INTO disabled_users VALUES(?)").run(
              target.name,
            );
            db.prepare("DELETE FROM sessions WHERE username=?").run(
              target.name,
            );
          }
          db.prepare("INSERT INTO access_events VALUES(?,?,?,?,?)").run(
            token(),
            target.name,
            actor.username,
            body.enabled ? 1 : 0,
            new Date(now()).toISOString(),
          );
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        return send(res, 200, { username: target.name, enabled: body.enabled });
      }
      if (method === "GET" && route === "/api/articles") {
        authorize(req);
        return send(res, 200, { articles: desk.listArticles() });
      }
      if (method === "POST" && route === "/api/articles") {
        const user = authorize(req, "admin");
        return send(
          res,
          201,
          desk.createArticle(await jsonBody(req), user.username),
        );
      }
      const article = route.match(
        /^\/api\/articles\/([a-f0-9-]+)(\/approve)?$/,
      );
      if (article && method === "PUT" && !article[2]) {
        const user = authorize(req, "admin");
        return send(
          res,
          200,
          desk.editArticle(article[1], await jsonBody(req), user.username),
        );
      }
      if (article && method === "POST" && article[2]) {
        const user = authorize(req, "admin");
        return send(res, 200, desk.approveArticle(article[1], user.username));
      }
      if (method === "POST" && route === "/api/ask") {
        limited(`ask:${req.socket.remoteAddress}`, 30);
        const body = await jsonBody(req),
          proof = token();
        const item = desk.ask({
          question: body.question,
          locale: body.locale,
          audience: "public",
        });
        db.prepare("INSERT INTO case_access VALUES(?,?)").run(
          item.id,
          hash(proof),
        );
        return send(res, 201, { ...publicCase(item), accessToken: proof });
      }
      const entry = route.match(/^\/api\/cases\/([a-f0-9-]+)(\/human)?$/);
      if (entry && method === "GET" && !entry[2])
        return send(res, 200, publicCase(visitorCase(req, entry[1])));
      if (entry && method === "POST" && entry[2]) {
        visitorCase(req, entry[1]);
        return send(res, 200, publicCase(desk.requestHuman(entry[1])));
      }
      if (method === "GET" && route === "/api/queue") {
        authorize(req);
        return send(res, 200, { cases: desk.listOpenCases() });
      }
      const resolve = route.match(/^\/api\/queue\/([a-f0-9-]+)\/resolve$/);
      if (resolve && method === "POST") {
        const user = authorize(req);
        const body = await jsonBody(req);
        return send(
          res,
          200,
          desk.resolveCase(resolve[1], body.reply, user.username),
        );
      }
      const audit = route.match(/^\/api\/audit\/([a-f0-9-]+)$/);
      if (audit && method === "GET") {
        authorize(req, "admin");
        return send(res, 200, { events: desk.audit(audit[1]) });
      }
      if (method === "GET" && route === "/api/backup") {
        authorize(req, "admin");
        return send(res, 200, {
          schema: "derekdesk-knowledge-v1",
          articles: desk.listArticles(),
          note: "Knowledge-only export. Import creates drafts. Cases and identities require an offline SQLite backup.",
        });
      }
      if (method === "POST" && route === "/api/import") {
        const user = authorize(req, "admin"),
          body = await jsonBody(req);
        if (
          body.schema !== "derekdesk-knowledge-v1" ||
          !Array.isArray(body.articles)
        )
          throw failure(400, "Неверный формат копии.");
        body.articles.forEach((value) => makeArticle(value));
        return send(res, 201, {
          articles: desk.importArticles(body.articles, user.username),
        });
      }
      if (method === "GET" && ["/", "/app.js", "/styles.css"].includes(route)) {
        const filename = route === "/" ? "index.html" : route.slice(1),
          data = await readFile(
            fileURLToPath(new URL(`../public/${filename}`, import.meta.url)),
          );
        res.writeHead(200, {
          "Content-Type": filename.endsWith(".css")
            ? "text/css"
            : filename.endsWith(".js")
              ? "text/javascript"
              : "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        return res.end(data);
      }
      throw failure(404, "Адрес не найден.");
    } catch (error) {
      const status = error.status || 400;
      send(res, status, {
        error:
          status >= 500
            ? "Сервер не смог обработать запрос."
            : error.message?.includes("UNIQUE constraint")
              ? "Такое имя уже существует."
              : error.message,
      });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on("close", () => desk.close());
  return { server, desk };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8791),
    host = process.env.HOST || "127.0.0.1",
    origin = process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`;
  const { server } = createDeskServer({
    database: process.env.DATABASE_PATH || ".data/desk.sqlite",
    origin,
    admin: process.env.DESK_ADMIN_PASSWORD
      ? {
          username: process.env.DESK_ADMIN_USER || "admin",
          password: process.env.DESK_ADMIN_PASSWORD,
        }
      : undefined,
  });
  server.listen(port, host, () =>
    console.log(`DerekDesk: ${origin}. Local binding ${host}.`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => server.close());
}
