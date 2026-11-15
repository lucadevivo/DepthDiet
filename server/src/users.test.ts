// Utenti separati: due token, due DB. Lancia con `npm test`.
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const MAIN = "m".repeat(32);
const FRIEND = "f".repeat(32);
process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "ft-users-")), "main.sqlite");
process.env.APP_BEARER_TOKEN = MAIN;
process.env.APP_EXTRA_USERS = `amico:${FRIEND}`;

const { createApp } = await import("./app.js");
const { runMigrations } = await import("./db/migrate.js");
const { parseUsers } = await import("./config/env.js");

test("ogni token vede solo il suo DB", async () => {
  runMigrations();
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/water`;
  const call = (token: string, init: RequestInit = {}, query = "?date=2026-10-07") =>
    fetch(base + query, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
  try {
    await call(FRIEND, { method: "POST", body: JSON.stringify({ date: "2026-10-07", amount_ml: 500 }) }, "");
    const friend = (await (await call(FRIEND)).json()) as { total_ml: number };
    const main = (await (await call(MAIN)).json()) as { total_ml: number };
    assert.equal(friend.total_ml, 500);
    assert.equal(main.total_ml, 0);
    assert.equal((await call("x".repeat(32))).status, 401);
  } finally {
    server.close();
  }
});

test("APP_EXTRA_USERS rifiuta nomi e token non validi", () => {
  assert.throws(() => parseUsers(`../luca:${FRIEND}`));
  assert.throws(() => parseUsers("amico:corto"));
  assert.deepEqual(parseUsers(` a:${FRIEND} ,`), [{ name: "a", token: FRIEND }]);
});
