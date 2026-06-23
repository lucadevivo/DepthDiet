import { getDb } from "../db/connection.js";

export interface WeightEntry {
  id: number;
  entry_date: string;
  weight_kg: number;
  created_at: string;
}

/** Registra (o aggiorna) il peso per una data. Una sola misura per giorno. */
export function logWeight(date: string, weightKg: number): WeightEntry {
  getDb()
    .prepare(
      `INSERT INTO weight_log (entry_date, weight_kg) VALUES (?, ?)
       ON CONFLICT(entry_date) DO UPDATE SET weight_kg = excluded.weight_kg`,
    )
    .run(date, weightKg);
  return getDb()
    .prepare("SELECT id, entry_date, weight_kg, created_at FROM weight_log WHERE entry_date = ?")
    .get(date) as unknown as WeightEntry;
}

/** Misure di peso, opzionalmente dagli ultimi `days` giorni, in ordine cronologico. */
export function listWeights(days?: number): WeightEntry[] {
  const db = getDb();
  if (days && days > 0) {
    return db
      .prepare(
        `SELECT id, entry_date, weight_kg, created_at FROM weight_log
          WHERE entry_date >= date('now', ?)
          ORDER BY entry_date`,
      )
      .all(`-${days} days`) as unknown as WeightEntry[];
  }
  return db
    .prepare("SELECT id, entry_date, weight_kg, created_at FROM weight_log ORDER BY entry_date")
    .all() as unknown as WeightEntry[];
}

export function deleteWeight(id: number): boolean {
  return getDb().prepare("DELETE FROM weight_log WHERE id = ?").run(id).changes > 0;
}
