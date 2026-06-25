import { getDb } from "../db/connection.js";

export interface CustomFood {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  kcal_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
  default_serving_g: number | null;
}

/** Tutti gli Alimenti Personali (usati dal match dello Scanner IA). */
export function getAllCustomFoods(): CustomFood[] {
  return getDb()
    .prepare(
      `SELECT id, name, brand, barcode, kcal_per_100, protein_per_100,
              carbs_per_100, fat_per_100, default_serving_g
         FROM custom_foods`,
    )
    .all() as unknown as CustomFood[];
}

/**
 * Alimenti Personali ordinati per FREQUENZA D'USO (quante volte compaiono nel
 * diario), poi dai più recenti. Serve allo Scanner IA per dare a Gemini, quando
 * la libreria è grande, prima gli alimenti che l'utente usa davvero.
 */
export function getCustomFoodsByUsage(): CustomFood[] {
  return getDb()
    .prepare(
      `SELECT cf.id, cf.name, cf.brand, cf.barcode, cf.kcal_per_100, cf.protein_per_100,
              cf.carbs_per_100, cf.fat_per_100, cf.default_serving_g
         FROM custom_foods cf
         LEFT JOIN diary_entries d ON d.custom_food_id = cf.id
        GROUP BY cf.id
        ORDER BY COUNT(d.id) DESC, cf.id DESC`,
    )
    .all() as unknown as CustomFood[];
}

export function getCustomFoodById(id: number): CustomFood | undefined {
  return getDb()
    .prepare(
      `SELECT id, name, brand, barcode, kcal_per_100, protein_per_100,
              carbs_per_100, fat_per_100, default_serving_g
         FROM custom_foods WHERE id = ?`,
    )
    .get(id) as unknown as CustomFood | undefined;
}

/** Ricerca per nome/brand (per il diario manuale). */
export function searchCustomFoods(q: string): CustomFood[] {
  const like = `%${q}%`;
  return getDb()
    .prepare(
      `SELECT id, name, brand, barcode, kcal_per_100, protein_per_100,
              carbs_per_100, fat_per_100, default_serving_g
         FROM custom_foods
        WHERE name LIKE ? OR brand LIKE ?
        ORDER BY name
        LIMIT 50`,
    )
    .all(like, like) as unknown as CustomFood[];
}

export interface CustomFoodInput {
  name: string;
  brand: string | null;
  barcode: string | null;
  kcal_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
  default_serving_g: number | null;
}

export function createCustomFood(input: CustomFoodInput): CustomFood {
  const info = getDb()
    .prepare(
      `INSERT INTO custom_foods
         (name, brand, barcode, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, default_serving_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.brand,
      input.barcode,
      input.kcal_per_100,
      input.protein_per_100,
      input.carbs_per_100,
      input.fat_per_100,
      input.default_serving_g,
    );
  return getCustomFoodById(Number(info.lastInsertRowid))!;
}

export function updateCustomFood(id: number, input: CustomFoodInput): CustomFood | undefined {
  getDb()
    .prepare(
      `UPDATE custom_foods SET
         name = ?, brand = ?, barcode = ?, kcal_per_100 = ?, protein_per_100 = ?,
         carbs_per_100 = ?, fat_per_100 = ?, default_serving_g = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      input.name,
      input.brand,
      input.barcode,
      input.kcal_per_100,
      input.protein_per_100,
      input.carbs_per_100,
      input.fat_per_100,
      input.default_serving_g,
      id,
    );
  return getCustomFoodById(id);
}

/** @returns true se una riga è stata eliminata. */
export function deleteCustomFood(id: number): boolean {
  const info = getDb().prepare("DELETE FROM custom_foods WHERE id = ?").run(id);
  return info.changes > 0;
}
