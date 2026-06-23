import { getDb } from "../db/connection.js";
import { getCustomFoodById, type CustomFood } from "./customFoods.js";
import { scaleFood, sumMacros, type Macros } from "../services/nutrition.js";

export interface RecipeItemInput {
  food_id: number;
  grams: number;
}

export interface RecipeItemDetail {
  id: number;
  food_id: number;
  food_name: string;
  grams: number;
  macros: Macros;
}

export interface Recipe {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  items: RecipeItemDetail[];
  totals: Macros;
  total_grams: number;
}

export interface RecipeSummary {
  id: number;
  name: string;
  itemCount: number;
  totals: Macros;
}

interface RecipeRow {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}
interface ItemRow {
  id: number;
  food_id: number;
  grams: number;
}

function loadItems(recipeId: number): RecipeItemDetail[] {
  const rows = getDb()
    .prepare("SELECT id, food_id, grams FROM recipe_items WHERE recipe_id = ? ORDER BY id")
    .all(recipeId) as unknown as ItemRow[];

  const details: RecipeItemDetail[] = [];
  for (const r of rows) {
    const food = getCustomFoodById(r.food_id);
    if (!food) continue; // alimento eliminato: lo saltiamo nel calcolo
    details.push({
      id: r.id,
      food_id: r.food_id,
      food_name: food.name,
      grams: r.grams,
      macros: scaleFood(food, r.grams),
    });
  }
  return details;
}

function hydrate(row: RecipeRow): Recipe {
  const items = loadItems(row.id);
  return {
    ...row,
    items,
    totals: sumMacros(items.map((i) => i.macros)),
    total_grams: items.reduce((s, i) => s + i.grams, 0),
  };
}

export function getRecipeById(id: number): Recipe | undefined {
  const row = getDb()
    .prepare("SELECT id, name, created_at, updated_at FROM recipes WHERE id = ?")
    .get(id) as unknown as RecipeRow | undefined;
  return row ? hydrate(row) : undefined;
}

export function getAllRecipes(): RecipeSummary[] {
  const rows = getDb()
    .prepare("SELECT id, name FROM recipes ORDER BY name")
    .all() as unknown as { id: number; name: string }[];
  return rows.map((r) => {
    const items = loadItems(r.id);
    return {
      id: r.id,
      name: r.name,
      itemCount: items.length,
      totals: sumMacros(items.map((i) => i.macros)),
    };
  });
}

/** Inserisce gli item (assume di essere dentro a una transazione). */
function insertItems(recipeId: number, items: RecipeItemInput[]): void {
  const stmt = getDb().prepare(
    "INSERT INTO recipe_items (recipe_id, food_id, grams) VALUES (?, ?, ?)",
  );
  for (const it of items) stmt.run(recipeId, it.food_id, it.grams);
}

export function createRecipe(name: string, items: RecipeItemInput[]): Recipe {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const info = db.prepare("INSERT INTO recipes (name) VALUES (?)").run(name);
    const id = Number(info.lastInsertRowid);
    insertItems(id, items);
    db.exec("COMMIT");
    return getRecipeById(id)!;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function updateRecipe(
  id: number,
  name: string,
  items: RecipeItemInput[],
): Recipe | undefined {
  const db = getDb();
  const exists = db.prepare("SELECT id FROM recipes WHERE id = ?").get(id);
  if (!exists) return undefined;
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE recipes SET name = ?, updated_at = datetime('now') WHERE id = ?").run(
      name,
      id,
    );
    db.prepare("DELETE FROM recipe_items WHERE recipe_id = ?").run(id);
    insertItems(id, items);
    db.exec("COMMIT");
    return getRecipeById(id);
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function deleteRecipe(id: number): boolean {
  // recipe_items ha ON DELETE CASCADE.
  const info = getDb().prepare("DELETE FROM recipes WHERE id = ?").run(id);
  return info.changes > 0;
}

/** Verifica che tutti i food_id esistano (per validare ricette/diario). */
export function allFoodsExist(foods: { food_id: number }[]): boolean {
  return foods.every((f): f is { food_id: number } => getCustomFoodById(f.food_id) !== undefined);
}

export type { CustomFood };
