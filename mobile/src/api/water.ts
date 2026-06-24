import { apiFetch } from "./client";
import type { WaterDay } from "../types/water";

export function getWater(date: string): Promise<WaterDay> {
  return apiFetch<WaterDay>(`/api/water?date=${date}`);
}

/** Applica una variazione (ml, anche negativa) al totale del giorno. */
export function addWater(date: string, amountMl: number): Promise<WaterDay> {
  return apiFetch<WaterDay>("/api/water", {
    method: "POST",
    body: JSON.stringify({ date, amount_ml: amountMl }),
  });
}
