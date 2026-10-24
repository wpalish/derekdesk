import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDeskServer } from "../src/server.js";

const password = "Synthetic-password-2026!";
const article = () => ({
  audience: "public",
  ru: {
    title: "Учебный возврат",
    answer: "Напишите сотруднику учебного центра.",
    aliases: ["возврат оплаты"],
  },
  kk: {
    title: "Оқу төлемін қайтару",
    answer: "Оқу орталығының қызметкеріне жазыңыз.",
    aliases: ["төлемді қайтару"],
  },
  source: {
    title: "Вымышленный регламент",
    url: "https://example.org/policy",
    excerpt: "Для возврата требуется обращение к сотруднику.",
    verifiedAt: new Date(Date.now() - 86400000).toISOString(),
    validUntil: new Date(Date.now() + 86400000 * 365).toISOString(),
  },
});
async function fixture(t, options = {}) {
  const { server, desk } = createDeskServer({
    admin: { username: "admin", password },
    ...options,
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(() => new Promise((resolve) => server.close(resolve)));
  async function request(path, method = "GET", body, headers = {}) {
    const response = await fetch(origin + path, {
      method,
      headers: {
        Origin: origin,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      headers: response.headers,
      data: await response.json(),
    };
  }
  async function login(username = "admin", pass = password) {
    const r = await request("/api/login", "POST", { username, password: pass });
    return {
      result: r,
      headers: {
        Cookie: r.headers.get("set-cookie")?.split(";")[0],
        "X-CSRF-Token": r.data.user?.csrf,
      },
    };
  }
  return { server, desk, request, login, origin };
}

test("anonymous visitors cannot read knowledge, queue, backup or create users", async (t) => {
  const f = await fixture(t);
  for (const path of ["/api/articles", "/api/queue", "/api/backup"])
    assert.equal((await f.request(path)).status, 401);
  assert.equal(
    (await f.request("/api/users", "POST", { username: "intruder", password }))
      .status,
    401,
  );
});
test("origin and CSRF checks guard session mutations; cookie is HttpOnly and same-site", async (t) => {
  const f = await fixture(t),
    { result, headers } = await f.login();
  assert.equal(result.status, 200);
  assert.match(result.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal(
    (
      await f.request("/api/articles", "POST", article(), {
        Cookie: headers.Cookie,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/api/articles", "POST", article(), {
        ...headers,
        Origin: "https://attacker.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.request("/api/articles", "POST", article(), headers)).status,
    201,
  );
  await f.request("/api/logout", "POST", {}, headers);
  assert.equal(
    (await f.request("/api/articles", "GET", null, headers)).status,
    401,
  );
});
test("operator can resolve a real queue entry but cannot approve knowledge or add accounts", async (t) => {
  const f = await fixture(t),
    admin = await f.login();
  assert.equal(
    (
      await f.request(
        "/api/users",
        "POST",
        { username: "operator", password, role: "operator" },
        admin.headers,
      )
    ).status,
    201,
  );
  const operator = await f.login("operator");
  assert.equal(
    (await f.request("/api/articles", "POST", article(), operator.headers))
      .status,
    403,
  );
  assert.equal(
    (
      await f.request(
        "/api/users",
        "POST",
        { username: "other", password },
        operator.headers,
      )
    ).status,
    403,
  );
  const question = await f.request("/api/ask", "POST", {
    question: "Как изменить учебную запись?",
    locale: "ru",
  });
  assert.equal(question.data.status, "open");
  const reply = await f.request(
    `/api/queue/${question.data.id}/resolve`,
    "POST",
    { reply: "Вымышленный ответ оператора." },
    operator.headers,
  );
  assert.equal(reply.data.status, "resolved");
  const read = await f.request(`/api/cases/${question.data.id}`, "GET", null, {
    "X-Case-Token": question.data.accessToken,
  });
  assert.equal(read.data.resolution.text, "Вымышленный ответ оператора.");
  assert.equal(read.data.resolution.actor, "Сотрудник");
});
test("case UUID alone and another visitor token do not expose a conversation", async (t) => {
  const f = await fixture(t),
    a = (
      await f.request("/api/ask", "POST", {
        question: "Первый вымышленный вопрос",
        locale: "ru",
      })
    ).data,
    b = (
      await f.request("/api/ask", "POST", {
        question: "Екінші оқу сұрағы",
        locale: "kk",
      })
    ).data;
  assert.equal((await f.request(`/api/cases/${a.id}`)).status, 404);
  assert.equal(
    (
      await f.request(`/api/cases/${a.id}`, "GET", null, {
        "X-Case-Token": b.accessToken,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await f.request(
        `/api/cases/${a.id}/human`,
        "POST",
        {},
        { "X-Case-Token": b.accessToken },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await f.request(`/api/cases/${a.id}`, "GET", null, {
        "X-Case-Token": a.accessToken,
      })
    ).data.question,
    a.question,
  );
});
test("public ask ignores forged staff audience and strips internal article snapshots", async (t) => {
  const f = await fixture(t),
    admin = await f.login(),
    input = article();
  input.audience = "staff";
  const stored = await f.request("/api/articles", "POST", input, admin.headers);
  await f.request(
    `/api/articles/${stored.data.id}/approve`,
    "POST",
    {},
    admin.headers,
  );
  const question = await f.request("/api/ask", "POST", {
    question: "возврат оплаты",
    locale: "ru",
    audience: "staff",
  });
  assert.equal(question.data.answer, null);
  assert.equal(question.data.status, "open");
  input.audience = "public";
  const p = await f.request("/api/articles", "POST", input, admin.headers);
  await f.request(
    `/api/articles/${p.data.id}/approve`,
    "POST",
    {},
    admin.headers,
  );
  const answer = await f.request("/api/ask", "POST", {
    question: "төлемді қайтару",
    locale: "kk",
  });
  assert.equal(answer.data.answer.text, input.kk.answer);
  assert.equal(answer.data.answer.articleSnapshot, undefined);
});
test("knowledge backup restoration validates atomically and resets imported approval", async (t) => {
  const f = await fixture(t),
    admin = await f.login(),
    created = await f.request(
      "/api/articles",
      "POST",
      article(),
      admin.headers,
    );
  await f.request(
    `/api/articles/${created.data.id}/approve`,
    "POST",
    {},
    admin.headers,
  );
  const backup = await f.request("/api/backup", "GET", null, admin.headers);
  assert.equal(backup.data.articles.length, 1);
  const invalid = {
    ...backup.data,
    articles: [
      article(),
      {
        ...article(),
        source: { ...article().source, url: "javascript:alert(1)" },
      },
    ],
  };
  assert.equal(
    (await f.request("/api/import", "POST", invalid, admin.headers)).status,
    400,
  );
  assert.equal(f.desk.listArticles().length, 1);
  const restored = await f.request(
    "/api/import",
    "POST",
    backup.data,
    admin.headers,
  );
  assert.equal(restored.data.articles[0].status, "draft");
  assert.equal(restored.data.articles[0].approvedBy, null);
});
test("server restart preserves case proof, operator reply and approved source", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "derekdesk-http-")),
    database = join(directory, "desk.sqlite");
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const first = createDeskServer({
    database,
    admin: { username: "admin", password },
  });
  await new Promise((resolve) => first.server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${first.server.address().port}`;
  const q = await (
    await fetch(origin + "/api/ask", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "Вопрос перед перезапуском",
        locale: "ru",
      }),
    })
  ).json();
  first.desk.resolveCase(q.id, "Ответ сохранён в базе.", "admin");
  await new Promise((resolve) => first.server.close(resolve));
  const second = await fixture(t, { database });
  const read = await second.request(`/api/cases/${q.id}`, "GET", null, {
    "X-Case-Token": q.accessToken,
  });
  assert.equal(read.data.resolution.text, "Ответ сохранён в базе.");
});
test("expired sessions and repeated wrong passwords are rejected", async (t) => {
  let clock = Date.now();
  const f = await fixture(t, { now: () => clock }),
    admin = await f.login();
  clock += 9 * 3600000;
  assert.equal(
    (await f.request("/api/queue", "GET", null, admin.headers)).status,
    401,
  );
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await f.login("admin", "Wrong-password-value")).result.status,
      401,
    );
  assert.equal((await f.login()).result.status, 429);
  clock += 900001;
  assert.equal((await f.login()).result.status, 200);
});

test("admin can revoke every operator session without removing history; operators and visitors cannot change access", async (t) => {
  const f = await fixture(t),
    admin = await f.login();
  assert.equal((await f.request("/api/users")).status, 401);
  await f.request(
    "/api/users",
    "POST",
    { username: "staff", password, role: "operator" },
    admin.headers,
  );
  const first = await f.login("staff"),
    second = await f.login("staff");
  assert.equal(
    (await f.request("/api/users", "GET", null, first.headers)).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        "/api/users/staff/access",
        "POST",
        { enabled: false },
        first.headers,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request(
        "/api/users/admin/access",
        "POST",
        { enabled: false },
        admin.headers,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        "/api/users/staff/access",
        "POST",
        { enabled: "false" },
        admin.headers,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request(
        "/api/users/staff/access",
        "POST",
        { enabled: false },
        { Cookie: admin.headers.Cookie },
      )
    ).status,
    403,
  );
  const original = await f.request("/api/ask", "POST", {
    question: "Синтетическое обращение до отключения",
    locale: "ru",
  });
  await f.request(
    "/api/queue/" + original.data.id + "/resolve",
    "POST",
    { reply: "Синтетический ответ сохраняется." },
    first.headers,
  );
  const history = f.desk.getCase(original.data.id);
  assert.equal(
    (
      await f.request(
        "/api/users/staff/access",
        "POST",
        { enabled: false },
        admin.headers,
      )
    ).status,
    200,
  );
  for (const staff of [first, second])
    assert.equal(
      (await f.request("/api/queue", "GET", null, staff.headers)).status,
      401,
    );
  assert.equal((await f.login("staff")).result.status, 401);
  const list = await f.request("/api/users", "GET", null, admin.headers);
  assert.equal(
    list.data.users.find((x) => x.username === "staff").enabled,
    false,
  );
  assert.ok(!JSON.stringify(list.data).includes("password"));
  assert.deepEqual(f.desk.getCase(original.data.id), history);
  assert.equal(
    (
      await f.request(
        "/api/users/staff/access",
        "POST",
        { enabled: true },
        admin.headers,
      )
    ).status,
    200,
  );
  assert.equal(
    (await f.request("/api/queue", "GET", null, first.headers)).status,
    401,
    "re-enable must not revive old session",
  );
  assert.equal((await f.login("staff")).result.status, 200);
  const events = f.desk.db
    .prepare("SELECT actor,enabled FROM access_events ORDER BY rowid")
    .all();
  assert.deepEqual(
    events.map((x) => [x.actor, x.enabled]),
    [
      ["admin", 0],
      ["admin", 1],
    ],
  );
});

test("operator revocation remains effective after a real database restart", async () => {
  const folder = mkdtempSync(join(tmpdir(), "derek-access-")),
    database = join(folder, "desk.sqlite");
  let current = createDeskServer({
    database,
    admin: { username: "admin", password },
  });
  await new Promise((resolve) =>
    current.server.listen(0, "127.0.0.1", resolve),
  );
  const request = async (path, method = "GET", body, headers = {}) => {
    const origin = "http://127.0.0.1:" + current.server.address().port;
    const r = await fetch(origin + path, {
      method,
      headers: {
        Origin: origin,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, data: await r.json(), headers: r.headers };
  };
  try {
    const auth = await request("/api/login", "POST", {
        username: "admin",
        password,
      }),
      headers = {
        Cookie: auth.headers.get("set-cookie").split(";")[0],
        "X-CSRF-Token": auth.data.user.csrf,
      };
    await request(
      "/api/users",
      "POST",
      { username: "staff", password, role: "operator" },
      headers,
    );
    await request(
      "/api/users/staff/access",
      "POST",
      { enabled: false },
      headers,
    );
    await new Promise((resolve) => current.server.close(resolve));
    current = createDeskServer({ database });
    await new Promise((resolve) =>
      current.server.listen(0, "127.0.0.1", resolve),
    );
    assert.equal(
      (await request("/api/login", "POST", { username: "staff", password }))
        .status,
      401,
    );
    assert.equal(
      (await request("/api/login", "POST", { username: "admin", password }))
        .status,
      200,
    );
    assert.equal(
      current.desk.db.prepare("SELECT count(*) n FROM access_events").get().n,
      1,
    );
  } finally {
    await new Promise((resolve) => current.server.close(resolve));
    rmSync(folder, { recursive: true, force: true });
  }
});
