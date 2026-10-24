import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KnowledgeDesk } from "../src/knowledge.js";
import { snapshot } from "../src/snapshot.js";
test("online snapshot preserves a WAL-backed case and refuses to overwrite an existing backup", async () => {
  const root = mkdtempSync(join(tmpdir(), "derek-snapshot-")),
    source = join(root, "source.sqlite"),
    destination = join(root, "backup.sqlite");
  const original = new KnowledgeDesk(source);
  try {
    const q = original.ask({
      question: "Вымышленный вопрос для копии",
      locale: "ru",
    });
    original.resolveCase(
      q.id,
      "Вымышленный сохранённый ответ.",
      "synthetic-operator",
    );
    await snapshot(source, destination);
    const restored = new KnowledgeDesk(destination);
    try {
      assert.equal(
        restored.getCase(q.id).resolution.text,
        "Вымышленный сохранённый ответ.",
      );
    } finally {
      restored.close();
    }
    assert.equal(statSync(destination).mode & 0o777, 0o600);
    await assert.rejects(snapshot(source, destination), /не перезаписываются/);
  } finally {
    original.close();
    rmSync(root, { recursive: true, force: true });
  }
});
