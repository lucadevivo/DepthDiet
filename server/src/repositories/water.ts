import { getDb } from "../db/connection.js";

/**
 * Contatore acqua: `water_log` ha una riga per ogni variazione (es. +250 / −250);
 * il totale del giorno è la SUM per `entry_date`. Teniamo questo modello a delta
 * (anziché un singolo valore) così resta coerente con lo schema esistente.
 */

export interface WaterDay {
  date: string;
  total_ml: number;
}

export function getWaterByDate(date: string): WaterDay {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(amount_ml), 0) AS total FROM water_log WHERE entry_date = ?")
    .get(date) as unknown as { total: number };
  return { date, total_ml: Math.max(0, row?.total ?? 0) };
}

/**
 * Applica una variazione (può essere negativa) al totale del giorno, senza mai
 * scendere sotto zero: registra il delta effettivo così la SUM resta = nuovo totale.
 */
export function addWater(date: string, deltaMl: number): WaterDay {
  const current = getWaterByDate(date).total_ml;
  const next = Math.max(0, current + Math.round(deltaMl));
  const applied = next - current;
  if (applied !== 0) {
    getDb()
      .prepare("INSERT INTO water_log (entry_date, amount_ml) VALUES (?, ?)")
      .run(date, applied);
  }
  return { date, total_ml: next };
}
