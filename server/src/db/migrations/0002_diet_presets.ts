import type { Migration } from "./types.js";

/**
 * F2 — obiettivo a 5 livelli + preset dieta.
 *
 * `goal` passa da (cut/maintain/bulk) a 5 valori (lose_weight/lose_slow/maintain/
 * light_bulk/bulk). SQLite non sa ALTERare un vincolo CHECK, quindi ricreiamo la
 * tabella `user_profile` (riga singola id=1, nessuna FK la referenzia → DROP sicuro)
 * mappando i vecchi valori: cut→lose_weight, bulk→bulk, maintain→maintain.
 * Aggiunge inoltre le colonne del preset dieta (percentuali macro).
 */
export const migration_0002_diet_presets: Migration = {
  version: 2,
  name: "diet_presets",
  sql: /* sql */ `
CREATE TABLE user_profile_new (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  weight_kg        REAL,
  height_cm        REAL,
  age              INTEGER,
  sex              TEXT    CHECK (sex IN ('male','female')),
  activity_level   TEXT    CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal             TEXT    CHECK (goal IN ('lose_weight','lose_slow','maintain','light_bulk','bulk')),
  -- preset di ripartizione dei macro; 'custom' usa le diet_*_pct sottostanti.
  diet_preset      TEXT    NOT NULL DEFAULT 'standard'
                     CHECK (diet_preset IN ('standard','balanced','low_fat','high_protein','keto','custom')),
  diet_carbs_pct   INTEGER,
  diet_protein_pct INTEGER,
  diet_fat_pct     INTEGER,
  target_calories  INTEGER,
  target_protein_g INTEGER,
  target_carbs_g   INTEGER,
  target_fat_g     INTEGER,
  water_target_ml  INTEGER NOT NULL DEFAULT 2500,
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO user_profile_new
  (id, weight_kg, height_cm, age, sex, activity_level, goal,
   target_calories, target_protein_g, target_carbs_g, target_fat_g, water_target_ml, updated_at)
SELECT
  id, weight_kg, height_cm, age, sex, activity_level,
  CASE goal WHEN 'cut' THEN 'lose_weight' WHEN 'bulk' THEN 'bulk' WHEN 'maintain' THEN 'maintain' ELSE goal END,
  target_calories, target_protein_g, target_carbs_g, target_fat_g, water_target_ml, updated_at
FROM user_profile;

DROP TABLE user_profile;
ALTER TABLE user_profile_new RENAME TO user_profile;
`,
};
