import type { Migration } from "./types.js";

/**
 * Schema iniziale. Tutte le date sono testo ISO ('YYYY-MM-DD' per i giorni,
 * datetime ISO per i timestamp): SQLite non ha un tipo data nativo e il testo
 * ordina correttamente.
 */
export const migration_0001_init: Migration = {
  version: 1,
  name: "init",
  sql: /* sql */ `
-- Profilo + obiettivi: riga singola (id forzato a 1), single-user.
CREATE TABLE user_profile (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  -- parametri fisici (compilati dal Calcolatore in Fase 3)
  weight_kg        REAL,
  height_cm        REAL,
  age              INTEGER,
  sex              TEXT    CHECK (sex IN ('male','female')),
  activity_level   TEXT    CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  goal             TEXT    CHECK (goal IN ('cut','bulk','maintain')),
  -- obiettivi correnti: derivati dal TDEE ma memorizzati per accesso rapido
  -- e per alimentare il TDEE adattivo (Fase 3).
  target_calories  INTEGER,
  target_protein_g INTEGER,
  target_carbs_g   INTEGER,
  target_fat_g     INTEGER,
  water_target_ml  INTEGER NOT NULL DEFAULT 2500,
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Garantisce sempre l'esistenza del profilo.
INSERT INTO user_profile (id) VALUES (1);

-- Alimenti Personali: macro per 100g. 'barcode' valorizzato per prodotti
-- confezionati / importati da Open Food Facts (Fase 3).
CREATE TABLE custom_foods (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  brand             TEXT,
  barcode           TEXT,
  kcal_per_100      REAL NOT NULL,
  protein_per_100   REAL NOT NULL,
  carbs_per_100     REAL NOT NULL,
  fat_per_100       REAL NOT NULL,
  default_serving_g REAL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_custom_foods_name ON custom_foods(name);
-- Un barcode identifica un solo prodotto (ma il barcode è opzionale).
CREATE UNIQUE INDEX idx_custom_foods_barcode ON custom_foods(barcode) WHERE barcode IS NOT NULL;

-- Ricette / Pasti Frequenti: composizione di più alimenti salvata come voce singola.
CREATE TABLE recipes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE recipe_items (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id)     ON DELETE CASCADE,
  food_id   INTEGER NOT NULL REFERENCES custom_foods(id) ON DELETE RESTRICT,
  grams     REAL    NOT NULL
);
CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);

-- Diario Giornaliero. I macro sono uno SNAPSHOT al momento del log: lo storico
-- resta corretto anche se l'alimento/ricetta sorgente viene modificato dopo.
CREATE TABLE diary_entries (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date     TEXT NOT NULL,                 -- 'YYYY-MM-DD'
  meal           TEXT NOT NULL CHECK (meal IN ('breakfast','lunch','dinner','snack')),
  source         TEXT NOT NULL CHECK (source IN ('manual','custom_food','recipe','scan','off')),
  custom_food_id INTEGER REFERENCES custom_foods(id) ON DELETE SET NULL,
  recipe_id      INTEGER REFERENCES recipes(id)      ON DELETE SET NULL,
  description    TEXT,                           -- etichetta libera (es. esito scan IA)
  grams          REAL,
  kcal           REAL NOT NULL,
  protein_g      REAL NOT NULL,
  carbs_g        REAL NOT NULL,
  fat_g          REAL NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_diary_date ON diary_entries(entry_date);

-- Contatore acqua: una riga per ogni aggiunta (es. +250ml). Il totale del giorno
-- è la SUM per entry_date.
CREATE TABLE water_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT    NOT NULL,
  amount_ml  INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_water_date ON water_log(entry_date);

-- Peso: una misura per giorno (per il grafico trend e il TDEE adattivo).
CREATE TABLE weight_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,
  weight_kg  REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_weight_date ON weight_log(entry_date);
`,
};
