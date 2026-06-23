import { getDb } from "../db/connection.js";

/** Un pasto gestibile dall'utente (F3). L'ordine in UI segue `position`. */
export interface Meal {
  id: number;
  name: string;
  position: number;
  created_at: string;
}

export function listMeals(): Meal[] {
  return getDb()
    .prepare("SELECT id, name, position, created_at FROM meals ORDER BY position, id")
    .all() as unknown as Meal[];
}

export function getMealById(id: number): Meal | undefined {
  return getDb()
    .prepare("SELECT id, name, position, created_at FROM meals WHERE id = ?")
    .get(id) as unknown as Meal | undefined;
}

/** Crea un pasto in coda (position = max+1). */
export function createMeal(name: string): Meal {
  const row = getDb().prepare("SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM meals").get() as {
    pos: number;
  };
  const info = getDb()
    .prepare("INSERT INTO meals (name, position) VALUES (?, ?)")
    .run(name, row.pos);
  return getMealById(Number(info.lastInsertRowid))!;
}

export function renameMeal(id: number, name: string): Meal | undefined {
  const info = getDb().prepare("UPDATE meals SET name = ? WHERE id = ?").run(name, id);
  return info.changes > 0 ? getMealById(id) : undefined;
}

/** Riassegna le `position` secondo l'ordine degli id forniti. Ignora id inesistenti. */
export function reorderMeals(orderedIds: number[]): Meal[] {
  const db = getDb();
  const stmt = db.prepare("UPDATE meals SET position = ? WHERE id = ?");
  db.exec("BEGIN");
  try {
    orderedIds.forEach((id, i) => stmt.run(i, id));
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return listMeals();
}

export function deleteMeal(id: number): boolean {
  const info = getDb().prepare("DELETE FROM meals WHERE id = ?").run(id);
  return info.changes > 0;
}
