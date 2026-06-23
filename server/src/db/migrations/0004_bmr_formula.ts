import type { Migration } from "./types.js";

/**
 * F4 — formula di calcolo del BMR selezionabile (Mifflin-St Jeor di default,
 * Harris-Benedict, Katch-McArdle). Katch-McArdle richiede la massa magra, quindi
 * aggiungiamo anche `body_fat_pct` (opzionale; se assente si ripiega su Mifflin).
 *
 * Semplici ADD COLUMN (default non-null per `formula`): nessun rebuild tabella.
 */
export const migration_0004_bmr_formula: Migration = {
  version: 4,
  name: "bmr_formula",
  sql: /* sql */ `
ALTER TABLE user_profile ADD COLUMN formula TEXT NOT NULL DEFAULT 'mifflin';
ALTER TABLE user_profile ADD COLUMN body_fat_pct REAL;
`,
};
