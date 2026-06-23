import type { DatabaseSync } from "node:sqlite";
import { getDb } from "./connection.js";
import { migrations } from "./migrations/index.js";

/**
 * Applica in ordine tutte le migrazioni non ancora eseguite.
 * Idempotente: rilanciarlo non riapplica ciò che è già stato fatto.
 * Ogni migrazione gira in una transazione: o tutta o niente.
 */
export function runMigrations(database: DatabaseSync = getDb()): number {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedRows = database
    .prepare("SELECT version FROM schema_migrations")
    .all() as { version: number }[];
  const applied = new Set(appliedRows.map((r) => r.version));

  const pending = migrations
    .filter((m) => !applied.has(m.version))
    .sort((a, b) => a.version - b.version);

  if (pending.length === 0) {
    console.log("[db] schema aggiornato, nessuna migrazione da applicare.");
    return 0;
  }

  const record = database.prepare(
    "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
  );

  for (const m of pending) {
    database.exec("BEGIN");
    try {
      database.exec(m.sql);
      record.run(m.version, m.name);
      database.exec("COMMIT");
      console.log(`[db] migrazione applicata: ${m.version}_${m.name}`);
    } catch (err) {
      database.exec("ROLLBACK");
      console.error(`[db] migrazione ${m.version}_${m.name} FALLITA, rollback eseguito.`);
      throw err;
    }
  }

  return pending.length;
}
