/**
 * Proxy verso Open Food Facts (gratuito, open, buona copertura italiana).
 * Normalizziamo i prodotti nel nostro formato "per 100g" così l'app può importarli
 * direttamente come Alimenti Personali. OFF non richiede API key, ma chiede un
 * User-Agent identificativo: lo impostiamo come da loro linee guida.
 */

const OFF_BASE = "https://world.openfoodfacts.org";
const USER_AGENT = "FoodTracker/0.1 (uso personale)";
const FIELDS = "code,product_name,brands,nutriments";

/** Prodotto OFF normalizzato (macro per 100g). */
export interface OffProduct {
  barcode: string;
  name: string;
  brand: string | null;
  kcal_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
}

const round = (n: number, d = 1): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};
const numOr = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * fetch verso OFF con retry su 5xx (il loro endpoint di ricerca cgi è spesso
 * sovraccarico e risponde 503). Backoff breve.
 */
async function offFetch(url: string, attempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.ok || res.status === 404) return res;
    last = res;
    if (res.status < 500 || i === attempts - 1) return res;
    await sleep(500 * 2 ** i);
  }
  return last!;
}

interface OffRaw {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
}

/** Converte un prodotto grezzo OFF nel nostro formato; null se senza dati nutrizionali utili. */
function normalize(raw: OffRaw, fallbackCode?: string): OffProduct | null {
  const n = raw.nutriments ?? {};
  let kcal = n["energy-kcal_100g"];
  // Se manca la kcal ma c'è l'energia in kJ, converti (1 kcal = 4.184 kJ).
  if (typeof kcal !== "number" && typeof n["energy_100g"] === "number") {
    kcal = (n["energy_100g"] as number) / 4.184;
  }
  const protein = n["proteins_100g"];
  const carbs = n["carbohydrates_100g"];
  const fat = n["fat_100g"];

  const hasData = [kcal, protein, carbs, fat].some((v) => typeof v === "number");
  if (!hasData) return null;

  const barcode = raw.code ?? fallbackCode ?? "";
  const name = raw.product_name?.trim() || "Prodotto senza nome";
  const brand = raw.brands ? raw.brands.split(",")[0]!.trim() : null;

  return {
    barcode,
    name,
    brand,
    kcal_per_100: round(numOr(kcal, 0), 0),
    protein_per_100: round(numOr(protein, 0)),
    carbs_per_100: round(numOr(carbs, 0)),
    fat_per_100: round(numOr(fat, 0)),
  };
}

/** Lookup di un prodotto per codice a barre. null se non trovato / senza dati. */
export async function fetchByBarcode(code: string): Promise<OffProduct | null> {
  const url = `${OFF_BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const res = await offFetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`OFF status ${res.status}`);
  }
  const data = (await res.json()) as { status?: number; product?: OffRaw };
  if (data.status === 0 || !data.product) return null;
  return normalize(data.product, code);
}

/** Ricerca prodotti per nome. Restituisce fino a `limit` risultati con dati nutrizionali. */
export async function searchByName(q: string, limit = 20): Promise<OffProduct[]> {
  const url =
    `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1&action=process&json=1&page_size=${limit}&fields=${FIELDS}`;
  const res = await offFetch(url);
  if (!res.ok) throw new Error(`OFF status ${res.status}`);
  const data = (await res.json()) as { products?: OffRaw[] };
  const products = data.products ?? [];
  return products
    .map((p) => normalize(p))
    .filter((p): p is OffProduct => p !== null);
}
