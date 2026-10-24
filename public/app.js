const screen = document.querySelector("#screen"),
  notice = document.querySelector("#notice");
let user = null,
  locale = "ru",
  visitorCase = null,
  visitorCases = [],
  mode = "visitor",
  fieldSequence = 0;
const E = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
function field(form, name, label, value = "", type = "text") {
  const id = `f-${name}-${++fieldSequence}`;
  const l = E("label", label);
  l.htmlFor = id;
  const input = E(type === "textarea" ? "textarea" : "input");
  input.name = name;
  input.id = id;
  if (type !== "textarea") input.type = type;
  input.value = value;
  input.required = true;
  form.append(l, input);
  return input;
}
function button(text, fn, cls) {
  const b = E("button", text, cls);
  b.type = "button";
  if (fn) b.addEventListener("click", () => run(fn, b));
  return b;
}
async function run(fn, b) {
  notice.textContent = "";
  if (b) b.disabled = true;
  try {
    await fn();
  } catch (e) {
    notice.textContent = e.message;
    notice.className = "error";
    notice.focus();
  } finally {
    if (b) b.disabled = false;
  }
}
async function api(path, method = "GET", body, extra = {}) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(user ? { "X-CSRF-Token": user.csrf } : {}),
      ...extra,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (res.status === 401 && user) {
    user = null;
    login();
  }
  if (!res.ok) throw Error(data.error || "Ошибка запроса.");
  return data;
}
const dict = {
  ru: {
    title: "Ответ по проверенному источнику",
    intro:
      "Задайте вопрос. Если утверждённого ответа нет, вопрос останется в очереди сотрудника.",
    question: "Ваш вопрос",
    send: "Найти ответ",
    queued: "Вопрос передан сотруднику",
    found: "Найден утверждённый ответ",
    resolved: "Сотрудник ответил",
    refresh: "Проверить ответ сотрудника",
    human: "Попросить сотрудника",
    source: "Источник",
    valid: "Проверить до",
    next: "Новый вопрос",
    empty: "История этой вкладки пока пуста.",
    privacy:
      "Не вводите пароли, платёжные данные и личные документы. Доступ к обращению сохраняется только в этой вкладке.",
  },
  kk: {
    title: "Тексерілген дереккөз бойынша жауап",
    intro:
      "Сұрақ қойыңыз. Бекітілген жауап болмаса, сұрақ қызметкердің кезегінде қалады.",
    question: "Сұрағыңыз",
    send: "Жауап іздеу",
    queued: "Сұрақ қызметкерге жіберілді",
    found: "Бекітілген жауап табылды",
    resolved: "Қызметкер жауап берді",
    refresh: "Қызметкердің жауабын тексеру",
    human: "Қызметкерге жүгіну",
    source: "Дереккөз",
    valid: "Қайта тексеру мерзімі",
    next: "Жаңа сұрақ",
    empty: "Бұл қойындыда өтініш жоқ.",
    privacy:
      "Құпиясөз, төлем деректері мен жеке құжаттарды енгізбеңіз. Өтінішке қолжетімділік тек осы қойындыда сақталады.",
  },
};
function saveCase(item) {
  visitorCase = item;
  const index = visitorCases.findIndex((x) => x.id === item.id);
  if (index < 0) visitorCases.push(item);
  else visitorCases[index] = item;
  try {
    sessionStorage.setItem("derekdesk-cases", JSON.stringify(visitorCases));
    sessionStorage.setItem("derekdesk-active", item.id);
  } catch {
    notice.textContent =
      "Не удалось сохранить ключи во вкладке. Не закрывайте её до получения ответа.";
  }
}
function caseView(host) {
  const t = dict[locale],
    item = visitorCase;
  host.replaceChildren();
  if (visitorCases.length) {
    const label = E(
        "label",
        locale === "kk"
          ? "Осы қойындыдағы өтініштер"
          : "Обращения этой вкладки",
      ),
      select = E("select");
    select.id = "case-history";
    label.htmlFor = select.id;
    for (const entry of visitorCases) {
      const option = E("option", entry.question.slice(0, 90));
      option.value = entry.id;
      select.append(option);
    }
    select.value = item?.id || visitorCases.at(-1).id;
    select.addEventListener("change", () => {
      visitorCase = visitorCases.find((x) => x.id === select.value);
      sessionStorage.setItem("derekdesk-active", visitorCase.id);
      caseView(host);
    });
    host.append(label, select);
  }
  if (!item) {
    host.append(E("p", t.empty, "muted"));
    return;
  }
  host.append(
    E(
      "h2",
      item.status === "resolved"
        ? t.resolved
        : item.status === "answered"
          ? t.found
          : t.queued,
    ),
    E("p", item.question),
  );
  if (item.answer) {
    host.append(
      E(
        "h3",
        locale === "kk"
          ? "Бастапқы бекітілген жауап"
          : "Первоначальный утверждённый ответ",
      ),
      E("p", item.answer.text, "answer"),
    );
    const source = E("div", undefined, "evidence"),
      link = E("a", item.answer.source.title);
    link.href = item.answer.source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    source.append(
      E("strong", t.source),
      link,
      E("p", item.answer.source.excerpt),
      E(
        "small",
        String(t.valid) +
          ": " +
          new Date(item.answer.source.validUntil).toLocaleDateString() +
          " · v" +
          item.answer.version,
      ),
    );
    host.append(source);
  }
  if (item.resolution) {
    host.append(
      E("h3", t.resolved),
      E("p", item.resolution.text, "answer"),
      E(
        "small",
        new Date(item.resolution.at).toLocaleString(
          locale === "kk" ? "kk-KZ" : "ru-KZ",
        ),
      ),
    );
  } else if (!item.answer)
    host.append(
      E(
        "p",
        locale === "kk"
          ? "Жауапты осы қойындыдан тексеріңіз."
          : "Проверьте ответ позже в этой вкладке.",
        "pending",
      ),
    );
  const actions = E("div", undefined, "actions");
  actions.append(
    button(
      t.refresh,
      async () => {
        const result = await api("/api/cases/" + item.id, "GET", null, {
          "X-Case-Token": item.accessToken,
        });
        saveCase({ ...result, accessToken: item.accessToken });
        caseView(host);
      },
      "secondary",
    ),
  );
  if (item.status === "answered")
    actions.append(
      button(
        t.human,
        async () => {
          const result = await api(
            "/api/cases/" + item.id + "/human",
            "POST",
            {},
            { "X-Case-Token": item.accessToken },
          );
          saveCase({ ...result, accessToken: item.accessToken });
          caseView(host);
        },
        "secondary",
      ),
    );
  host.append(actions);
}
function visitor() {
  mode = "visitor";
  setNav();
  const t = dict[locale];
  screen.replaceChildren(E("h1", t.title), E("p", t.intro));
  const work = E("div", undefined, "work"),
    left = E("section", undefined, "panel"),
    right = E("section", undefined, "panel"),
    form = E("form");
  const languages = E("div", undefined, "actions");
  for (const l of ["ru", "kk"])
    languages.append(
      button(
        l === "ru" ? "Русский" : "Қазақша",
        () => {
          locale = l;
          document.documentElement.lang = l;
          visitor();
        },
        l === locale ? "" : "secondary",
      ),
    );
  left.append(languages);
  field(form, "question", t.question, "", "textarea");
  const submit = E("button", t.send);
  submit.type = "submit";
  form.append(E("div", undefined, "actions"));
  form.lastChild.append(submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(async () => {
      const item = await api("/api/ask", "POST", {
        question: new FormData(form).get("question"),
        locale,
      });
      saveCase(item);
      caseView(right);
    }, submit);
  });
  left.append(form, E("p", t.privacy, "muted"));
  work.append(left, right);
  screen.append(work);
  caseView(right);
}
function setNav() {
  const kk = mode === "visitor" && locale === "kk";
  document.documentElement.lang = kk ? "kk" : "ru";
  document.querySelector("header span").textContent = kk
    ? "Дереккөздер және қолдау"
    : "Источники и поддержка";
  document
    .querySelector("nav")
    .setAttribute("aria-label", kk ? "Бөлімдер" : "Разделы");
  document.querySelector(".skip").textContent = kk
    ? "Мазмұнға өту"
    : "К содержанию";
  document.getElementById("visitor-tab").textContent = kk
    ? "Сұрақ қою"
    : "Задать вопрос";
  document.getElementById("desk-tab").textContent = kk
    ? "Қызметкер кабинеті"
    : "Кабинет сотрудника";
  document.querySelector("footer").textContent = kk
    ? "Жеке орнату · Нейрожелісіз сөз тіркестерін сәйкестендіру · 0.1 нұсқасы"
    : "Самостоятельное размещение · Правила сопоставления без нейросети · Версия 0.1";
  for (const [id, value] of [
    ["visitor-tab", "visitor"],
    ["desk-tab", "desk"],
  ]) {
    const b = document.getElementById(id);
    if (mode === value) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
}
function login() {
  mode = "desk";
  setNav();
  screen.replaceChildren(
    E("h1", "Вход сотрудника"),
    E(
      "p",
      "Аккаунт создаёт администратор сервера. Общего демонстрационного пароля нет.",
    ),
  );
  const form = E("form", undefined, "panel");
  form.style.maxWidth = "460px";
  field(form, "username", "Имя пользователя").autocomplete = "username";
  field(form, "password", "Пароль", "", "password").autocomplete =
    "current-password";
  const submit = E("button", "Войти");
  submit.type = "submit";
  form.append(E("div", undefined, "actions"));
  form.lastChild.append(submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(async () => {
      user = (
        await api("/api/login", "POST", Object.fromEntries(new FormData(form)))
      ).user;
      await workspace();
    }, submit);
  });
  screen.append(form);
}
async function workspace() {
  mode = "desk";
  setNav();
  if (!user) return login();
  const [knowledge, queue] = await Promise.all([
    api("/api/articles"),
    api("/api/queue"),
  ]);
  screen.replaceChildren(
    E(
      "h1",
      user.role === "admin" ? "Источники и очередь" : "Очередь сотрудника",
    ),
    E(
      "p",
      `${user.username} · ${user.role === "admin" ? "Администратор" : "Оператор"}`,
    ),
  );
  const controls = E("div", undefined, "actions");
  controls.append(
    button("Обновить очередь", workspace, "secondary"),
    button(
      "Выйти",
      async () => {
        await api("/api/logout", "POST", {});
        user = null;
        login();
      },
      "secondary",
    ),
  );
  screen.append(controls);
  const work = E("div", undefined, "work"),
    left = E("section", undefined, "panel"),
    right = E("section", undefined, "panel");
  left.append(E("h2", `Открытые обращения (${queue.cases.length})`));
  if (!queue.cases.length)
    left.append(
      E(
        "p",
        "Очередь пуста. Новые неизвестные вопросы появятся здесь.",
        "muted",
      ),
    );
  for (const item of queue.cases) {
    const box = E("article", undefined, "entry");
    box.append(
      E("h3", item.question),
      E(
        "p",
        `${item.locale.toUpperCase()} · ${new Date(item.createdAt).toLocaleString()}`,
        "muted",
      ),
    );
    const form = E("form");
    field(
      form,
      "reply",
      `Ответ сотрудника (${item.locale.toUpperCase()})`,
      "",
      "textarea",
    );
    const submit = E("button", "Ответить и закрыть");
    submit.type = "submit";
    form.append(E("div", undefined, "actions"));
    form.lastChild.append(submit);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      run(async () => {
        await api(`/api/queue/${item.id}/resolve`, "POST", {
          reply: new FormData(form).get("reply"),
        });
        await workspace();
      }, submit);
    });
    box.append(form);
    left.append(box);
  }
  right.append(E("h2", "Материалы"));
  if (!knowledge.articles.length)
    right.append(
      E(
        "p",
        "Материалов пока нет. Администратор добавляет источник и утверждает ответ.",
        "muted",
      ),
    );
  for (const article of knowledge.articles) {
    const row = E("article", undefined, "entry"),
      expired = Date.parse(article.source.validUntil) <= Date.now();
    row.append(
      E("h3", article.ru?.title || article.kk?.title),
      E(
        "p",
        `${article.status === "approved" ? "Одобрен" : "Черновик"} · v${article.version} · ${article.audience === "staff" ? "Внутренний" : "Публичный"}${expired ? " · Срок истёк" : ""}`,
        expired ? "pending" : "status",
      ),
      E(
        "small",
        `Источник: ${article.source.title} · до ${article.source.validUntil.slice(0, 10)}`,
      ),
    );
    if (user.role === "admin") {
      const actions = E("div", undefined, "actions");
      actions.append(
        button("Изменить", () => articleForm(article), "secondary"),
      );
      if (article.status !== "approved" && !expired)
        actions.append(
          button("Одобрить", async () => {
            await api(`/api/articles/${article.id}/approve`, "POST", {});
            await workspace();
          }),
        );
      row.append(actions);
    }
    right.append(row);
  }
  if (user.role === "admin") {
    right.append(button("Добавить материал", () => articleForm()));
    const operations = E("div", undefined, "actions");
    operations.append(
      button(
        "Скачать копию знаний",
        async () => {
          const data = await api("/api/backup");
          download("derekdesk-knowledge.json", data);
        },
        "secondary",
      ),
      button("Создать оператора", userForm, "secondary"),
      button("Доступ операторов", accessManager, "secondary"),
    );
    right.append(operations);
    const label = E("label", "Восстановить знания как черновики"),
      input = E("input");
    input.type = "file";
    input.accept = ".json,application/json";
    label.append(input);
    input.addEventListener("change", () =>
      run(async () => {
        if (!input.files[0]) return;
        await api(
          "/api/import",
          "POST",
          JSON.parse(await input.files[0].text()),
        );
        await workspace();
        notice.textContent =
          "Копия импортирована. Все материалы требуют одобрения.";
      }),
    );
    right.append(
      label,
      E(
        "small",
        "Копия содержит только знания. Переписка и аккаунты сохраняются в SQLite на сервере.",
      ),
    );
  }
  work.append(left, right);
  screen.append(work);
}
function articleForm(article) {
  screen.replaceChildren(
    E("h1", article ? "Изменить материал" : "Новый материал"),
    E(
      "p",
      "После сохранения материал становится черновиком. Проверяйте переводы и источник перед одобрением.",
    ),
  );
  const form = E("form", undefined, "panel");
  for (const l of ["ru", "kk"]) {
    form.append(E("h2", l === "ru" ? "Русский ответ" : "Қазақша жауап"));
    field(form, `${l}_title`, "Заголовок", article?.[l]?.title || "").required =
      false;
    field(
      form,
      `${l}_answer`,
      "Точный ответ",
      article?.[l]?.answer || "",
      "textarea",
    ).required = false;
    field(
      form,
      `${l}_aliases`,
      "Формулировки вопроса, по одной на строку",
      article?.[l]?.aliases.join("\n") || "",
      "textarea",
    ).required = false;
  }
  form.append(E("h2", "Источник и актуальность"));
  field(
    form,
    "source_title",
    "Название источника",
    article?.source.title || "",
  );
  field(
    form,
    "source_url",
    "Ссылка на источник",
    article?.source.url || "",
    "url",
  );
  field(
    form,
    "source_excerpt",
    "Точный фрагмент",
    article?.source.excerpt || "",
    "textarea",
  );
  field(
    form,
    "verifiedAt",
    "Проверено",
    article?.source.verifiedAt.slice(0, 10) ||
      new Date().toISOString().slice(0, 10),
    "date",
  );
  field(
    form,
    "validUntil",
    "Перепроверить до",
    article?.source.validUntil.slice(0, 10) || "",
    "date",
  );
  const label = E("label", "Доступ"),
    audience = E("select");
  audience.name = "audience";
  for (const [v, t] of [
    ["public", "Публичный"],
    ["staff", "Только сотрудники"],
  ]) {
    const o = E("option", t);
    o.value = v;
    audience.append(o);
  }
  audience.value = article?.audience || "public";
  label.append(audience);
  form.append(label);
  const actions = E("div", undefined, "actions"),
    submit = E("button", "Сохранить черновик");
  submit.type = "submit";
  actions.append(submit, button("Вернуться", workspace, "secondary"));
  form.append(actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(async () => {
      const data = Object.fromEntries(new FormData(form));
      const content = (l) =>
        data[`${l}_title`] || data[`${l}_answer`] || data[`${l}_aliases`]
          ? {
              title: data[`${l}_title`],
              answer: data[`${l}_answer`],
              aliases: data[`${l}_aliases`]
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean),
            }
          : null;
      const input = {
        audience: data.audience,
        ru: content("ru"),
        kk: content("kk"),
        source: {
          title: data.source_title,
          url: data.source_url,
          excerpt: data.source_excerpt,
          verifiedAt: data.verifiedAt,
          validUntil: data.validUntil,
        },
      };
      await api(
        article ? `/api/articles/${article.id}` : "/api/articles",
        article ? "PUT" : "POST",
        input,
      );
      await workspace();
    }, submit);
  });
  screen.append(form);
}
async function accessManager() {
  if (user?.role !== "admin") return workspace();
  const { users } = await api("/api/users");
  screen.replaceChildren(
    E("h1", "Доступ операторов"),
    E(
      "p",
      "Отключение прекращает все действующие сеансы оператора. История обращений и ответов сохраняется. Повторное разрешение входа требует нового входа с прежним паролем.",
    ),
  );
  const controls = E("div", undefined, "actions");
  controls.append(
    button("Вернуться", workspace, "secondary"),
    button("Создать оператора", userForm),
  );
  screen.append(controls);
  const operators = users.filter((entry) => entry.role === "operator");
  if (!operators.length)
    screen.append(
      E(
        "p",
        "Операторов пока нет. Создайте учётную запись для сотрудника.",
        "muted",
      ),
    );
  for (const entry of operators) {
    const row = E("section", undefined, "entry");
    row.append(
      E("h2", entry.username, "access-name"),
      E("p", entry.enabled ? "Вход разрешён" : "Доступ отключён"),
    );
    const action = button(
      entry.enabled ? "Отключить вход" : "Разрешить вход",
      async () => {
        await api(
          `/api/users/${encodeURIComponent(entry.username)}/access`,
          "POST",
          { enabled: !entry.enabled },
        );
        await accessManager();
        notice.textContent = entry.enabled
          ? "Вход отключён, все сеансы оператора прекращены."
          : "Вход разрешён. Оператор должен войти заново.";
      },
      "secondary",
    );
    action.setAttribute(
      "aria-label",
      (entry.enabled ? "Отключить вход для " : "Разрешить вход для ") +
        entry.username,
    );
    row.append(action);
    screen.append(row);
  }
}
function userForm() {
  screen.replaceChildren(E("h1", "Новый оператор"));
  const form = E("form", undefined, "panel");
  field(form, "username", "Имя латиницей");
  const password = field(
    form,
    "password",
    "Пароль, минимум 14 символов",
    "",
    "password",
  );
  password.minLength = 14;
  password.autocomplete = "new-password";
  const submit = E("button", "Создать оператора");
  submit.type = "submit";
  form.append(E("div", undefined, "actions"));
  form.lastChild.append(submit, button("Вернуться", workspace, "secondary"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(async () => {
      await api("/api/users", "POST", {
        ...Object.fromEntries(new FormData(form)),
        role: "operator",
      });
      await workspace();
      notice.textContent =
        "Оператор создан. Передайте пароль защищённым способом.";
    }, submit);
  });
  screen.append(form);
}
function download(name, data) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    ),
    a = E("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document
  .getElementById("visitor-tab")
  .addEventListener("click", () => run(visitor));
document.getElementById("desk-tab").addEventListener("click", () =>
  run(async () => {
    user = (await api("/api/session")).user;
    await workspace();
  }),
);
try {
  const stored = JSON.parse(
    sessionStorage.getItem("derekdesk-cases") || "null",
  );
  const legacy = JSON.parse(sessionStorage.getItem("derekdesk-case") || "null");
  visitorCases = Array.isArray(stored)
    ? stored.filter(
        (x) =>
          x && typeof x.id === "string" && typeof x.accessToken === "string",
      )
    : legacy
      ? [legacy]
      : [];
  visitorCase =
    visitorCases.find(
      (x) => x.id === sessionStorage.getItem("derekdesk-active"),
    ) ||
    visitorCases.at(-1) ||
    null;
} catch {
  visitorCases = [];
  visitorCase = null;
}
visitor();
