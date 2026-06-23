import type { Macros } from "./food";

export type DiarySource = "manual" | "custom_food" | "recipe" | "scan" | "off";

export interface DiaryEntry {
  id: number;
  entry_date: string;
  /** Pasto di appartenenza; null se il pasto è stato eliminato (gruppo "Other"). */
  meal_id: number | null;
  source: DiarySource;
  custom_food_id: number | null;
  recipe_id: number | null;
  description: string | null;
  grams: number | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: string;
}

export interface DiaryDay {
  date: string;
  entries: DiaryEntry[];
  totals: Macros;
}

/** Corpo per aggiungere una voce al diario (le modalità del backend). */
export type AddDiaryBody =
  | { date: string; meal_id: number; type: "custom_food"; food_id: number; grams: number }
  | { date: string; meal_id: number; type: "recipe"; recipe_id: number; multiplier?: number }
  | {
      date: string;
      meal_id: number;
      type: "manual" | "scan";
      description: string;
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      grams?: number;
    };
