import type { Migration } from "./types.js";

/**
 * Creatina: una riga per giorno con un flag "presa/non presa". Chiave primaria su
 * entry_date così l'UPSERT mantiene al massimo una riga per data.
 */
export const migration_0005_creatine: Migration = {
  version: 5,
  name: "creatine",
  sql: /* sql */ `
CREATE TABLE creatine_log (
  entry_date TEXT    PRIMARY KEY,
  taken      INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
`,
};
