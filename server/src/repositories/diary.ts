import { getDb } from "../db/connection.js";
import { sumMacros, type Macros } from "../services/nutrition.js";

export type DiarySource = "manual" | "custom_food" | "recipe" | "scan" | "off";

export interface DiaryEntry {
  id: number;
  entry_date: string;
  /** Pasto di appartenenza; null se il pasto è stato eliminato (gruppo "Other"). */
  meal_id: number | null;
  source: DiarySource;
  custom_food_id: number | null;
  recipe_id: number | null;
  description: string | null;
  grams: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface DiaryDay {
  date: string;
  entries: DiaryEntry[];
  totals: Macros;
}

export interface NewDiaryEntry {
  entry_date: string;
  meal_id: number | null;
  source: DiarySource;
  custom_food_id: number | null;
  recipe_id: number | null;
  description: string | null;
  grams: number | null;
  /** Snapshot dei macro al momento del log (vedi schema: lo storico resta corretto). */
  macros: Macros;
}

export function getDiaryByDate(date: string): DiaryDay {
  const entries = getDb()
    .prepare(
      `SELECT id, entry_date, meal_id, source, custom_food_id, recipe_id, description, grams,
              kcal, protein_g, carbs_g, fat_g, created_at
         FROM diary_entries
        WHERE entry_date = ?
        ORDER BY created_at`,
    )
    .all(date) as unknown as DiaryEntry[];

  const totals = sumMacros(
    entries.map((e) => ({
      kcal: e.kcal,
      protein_g: e.protein_g,
      carbs_g: e.carbs_g,
      fat_g: e.fat_g,
    })),
  );
  return { date, entries, totals };
}

export function addDiaryEntry(e: NewDiaryEntry): DiaryEntry {
  const info = getDb()
    .prepare(
      `INSERT INTO diary_entries
         (entry_date, meal_id, source, custom_food_id, recipe_id, description, grams,
          kcal, protein_g, carbs_g, fat_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      e.entry_date,
      e.meal_id,
      e.source,
      e.custom_food_id,
      e.recipe_id,
      e.description,
      e.grams,
      e.macros.kcal,
      e.macros.protein_g,
      e.macros.carbs_g,
      e.macros.fat_g,
    );
  return getDb()
    .prepare(
      `SELECT id, entry_date, meal_id, source, custom_food_id, recipe_id, description, grams,
              kcal, protein_g, carbs_g, fat_g, created_at
         FROM diary_entries WHERE id = ?`,
    )
    .get(Number(info.lastInsertRowid)) as unknown as DiaryEntry;
}

export function getDiaryEntryById(id: number): DiaryEntry | undefined {
  return getDb()
    .prepare(
      `SELECT id, entry_date, meal_id, source, custom_food_id, recipe_id, description, grams,
              kcal, protein_g, carbs_g, fat_g, created_at
         FROM diary_entries WHERE id = ?`,
    )
    .get(id) as unknown as DiaryEntry | undefined;
}

/** Aggiorna grammatura + snapshot macro di una voce esistente (modifica porzione). */
export function updateDiaryEntry(id: number, grams: number, macros: Macros): DiaryEntry | undefined {
  getDb()
    .prepare(
      `UPDATE diary_entries SET
         grams = ?, kcal = ?, protein_g = ?, carbs_g = ?, fat_g = ?
       WHERE id = ?`,
    )
    .run(grams, macros.kcal, macros.protein_g, macros.carbs_g, macros.fat_g, id);
  return getDiaryEntryById(id);
}

export function deleteDiaryEntry(id: number): boolean {
  const info = getDb().prepare("DELETE FROM diary_entries WHERE id = ?").run(id);
  return info.changes > 0;
}
