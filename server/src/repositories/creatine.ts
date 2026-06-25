import { getDb } from "../db/connection.js";

/**
 * Creatina: un flag "presa/non presa" per giorno (`creatine_log`, una riga per
 * data). Modello a valore singolo (non a delta come l'acqua): è un booleano.
 */

export interface CreatineDay {
  date: string;
  taken: boolean;
}

export function getCreatineByDate(date: string): CreatineDay {
  const row = getDb()
    .prepare("SELECT taken FROM creatine_log WHERE entry_date = ?")
    .get(date) as unknown as { taken: number } | undefined;
  return { date, taken: (row?.taken ?? 0) === 1 };
}

/** Imposta (upsert) il flag creatina del giorno. */
export function setCreatine(date: string, taken: boolean): CreatineDay {
  getDb()
    .prepare(
      `INSERT INTO creatine_log (entry_date, taken, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(entry_date) DO UPDATE SET taken = excluded.taken, updated_at = datetime('now')`,
    )
    .run(date, taken ? 1 : 0);
  return { date, taken };
}
