/** Tipi condivisi del dominio nutrizionale (usati da Dashboard, Storico, ecc.). */

export type MealName = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_LABELS: Record<MealName, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** Macro in valore assoluto (totali o obiettivi). */
export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Riepilogo di una singola giornata. */
export interface DaySummary {
  /** 'YYYY-MM-DD' */
  date: string;
  totals: Macros;
  targets: Macros;
  waterMl: number;
  waterTargetMl: number;
  /** Totali per pasto (per la vista Storico). */
  meals: { meal: MealName; calories: number }[];
}
