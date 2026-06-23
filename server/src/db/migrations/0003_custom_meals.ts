import type { Migration } from "./types.js";

/**
 * F3 — pasti personalizzati. Il pasto smette di essere un enum fisso
 * (breakfast/lunch/dinner/snack) e diventa una riga gestibile dall'utente
 * nella tabella `meals`. `diary_entries.meal` (TEXT con CHECK) viene sostituito
 * da `diary_entries.meal_id` (FK → meals, ON DELETE SET NULL: se cancelli un
 * pasto le voci storiche restano e finiscono nel gruppo "Other").
 *
 * I 4 pasti storici vengono creati come righe iniziali (in inglese) così le voci
 * di diario esistenti mantengono il loro raggruppamento.
 */
export const migration_0003_custom_meals: Migration = {
  version: 3,
  name: "custom_meals",
  sql: /* sql */ `
CREATE TABLE meals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO meals (name, position) VALUES
  ('Breakfast', 0), ('Lunch', 1), ('Dinner', 2), ('Snack', 3);

-- Ricrea diary_entries senza il vincolo enum su 'meal', con meal_id al suo posto.
CREATE TABLE diary_entries_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date     TEXT NOT NULL,
  meal_id        INTEGER REFERENCES meals(id) ON DELETE SET NULL,
  source         TEXT NOT NULL CHECK (source IN ('manual','custom_food','recipe','scan','off')),
  custom_food_id INTEGER REFERENCES custom_foods(id) ON DELETE SET NULL,
  recipe_id      INTEGER REFERENCES recipes(id)      ON DELETE SET NULL,
  description    TEXT,
  grams          REAL,
  kcal           REAL NOT NULL,
  protein_g      REAL NOT NULL,
  carbs_g        REAL NOT NULL,
  fat_g          REAL NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO diary_entries_new
  (id, entry_date, meal_id, source, custom_food_id, recipe_id, description, grams,
   kcal, protein_g, carbs_g, fat_g, created_at)
SELECT
  d.id, d.entry_date,
  (SELECT m.id FROM meals m WHERE m.name = CASE d.meal
     WHEN 'breakfast' THEN 'Breakfast'
     WHEN 'lunch'     THEN 'Lunch'
     WHEN 'dinner'    THEN 'Dinner'
     WHEN 'snack'     THEN 'Snack' END),
  d.source, d.custom_food_id, d.recipe_id, d.description, d.grams,
  d.kcal, d.protein_g, d.carbs_g, d.fat_g, d.created_at
FROM diary_entries d;

DROP TABLE diary_entries;
ALTER TABLE diary_entries_new RENAME TO diary_entries;

CREATE INDEX idx_diary_date ON diary_entries(entry_date);
CREATE INDEX idx_diary_meal ON diary_entries(meal_id);
`,
};
