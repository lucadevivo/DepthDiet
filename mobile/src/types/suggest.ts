import type { Macros } from "./food";

/** Un suggerimento su cosa mangiare per chiudere i macro mancanti del giorno. */
export interface MealSuggestion {
  name: string;
  reason: string;
  portion: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** true se preso dalla libreria personale (Alimenti/Ricette). */
  from_library: boolean;
}

export interface SuggestResult {
  suggestions: MealSuggestion[];
  notes?: string;
  model: string;
  /** Macro ancora da coprire per l'obiettivo della giornata. */
  remaining: Macros;
}

export interface SuggestBody {
  date: string;
  /** Se true, l'IA consiglia solo dai tuoi Alimenti/Ricette salvati. */
  onlyLibrary: boolean;
  /** Richiesta libera opzionale (un cibo/bevanda, una voglia, dove ti trovi...). */
  note?: string;
}
