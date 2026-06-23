import type { Macros } from "./food";
import type { MealName } from "./nutrition";

export type DiarySource = "manual" | "custom_food" | "recipe" | "scan" | "off";

export interface DiaryEntry {
  id: number;
  entry_date: string;
  meal: MealName;
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
  | { date: string; meal: MealName; type: "custom_food"; food_id: number; grams: number }
  | { date: string; meal: MealName; type: "recipe"; recipe_id: number; multiplier?: number }
  | {
      date: string;
      meal: MealName;
      type: "manual" | "scan";
      description: string;
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      grams?: number;
    };
