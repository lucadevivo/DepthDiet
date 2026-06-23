/** Alimento Personale (mirror backend, Fase 3b). Macro per 100g. */
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

export interface CustomFoodInput {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  kcal_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
  default_serving_g?: number | null;
}

/** Macro in valore assoluto (porzione/pasto/giorno) come li restituisce il backend. */
export interface Macros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface RecipeSummary {
  id: number;
  name: string;
  itemCount: number;
  totals: Macros;
}

export interface RecipeItemInput {
  food_id: number;
  grams: number;
}

/** Prodotto normalizzato da Open Food Facts (Fase 3c). */
export interface OffProduct {
  barcode: string;
  name: string;
  brand: string | null;
  kcal_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
}
