import { apiFetch, ApiError } from "./client";
import type { OffProduct } from "../types/food";

/** Lookup per codice a barre. Restituisce null se il prodotto non è su OFF (404). */
export async function lookupBarcode(code: string): Promise<OffProduct | null> {
  try {
    return await apiFetch<OffProduct>(`/api/off/barcode/${encodeURIComponent(code)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Ricerca prodotti per nome su Open Food Facts. */
export function searchOff(q: string): Promise<OffProduct[]> {
  return apiFetch<OffProduct[]>(`/api/off/search?q=${encodeURIComponent(q)}`);
}
