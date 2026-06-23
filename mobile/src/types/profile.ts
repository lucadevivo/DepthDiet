/** Tipi del profilo/obiettivi (mirror di quelli del backend, Fase 3a + F2). */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose_weight" | "lose_slow" | "maintain" | "light_bulk" | "bulk";
export type DietPreset = "standard" | "balanced" | "low_fat" | "high_protein" | "keto" | "custom";

export interface MacroPercentages {
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
}

export interface Profile {
  id: number;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
  diet_preset: DietPreset;
  diet_carbs_pct: number | null;
  diet_protein_pct: number | null;
  diet_fat_pct: number | null;
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  water_target_ml: number;
  updated_at: string;
}

export interface ProfileInput {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: Goal;
  diet_preset?: DietPreset;
  custom_pct?: MacroPercentages;
}

export interface DietInput {
  diet_preset: DietPreset;
  custom_pct?: MacroPercentages;
}

export interface PutProfileResponse {
  profile: Profile;
  computation: { bmr: number; tdee: number };
}

export interface PutDietResponse {
  profile: Profile;
}

// --- Etichette/opzioni per la UI (in inglese) ---

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/** Goal a 5 livelli con la variazione % sul TDEE mostrata in etichetta. */
export const GOAL_OPTIONS: { value: Goal; label: string; desc: string }[] = [
  { value: "lose_weight", label: "Lose weight", desc: "−20% of your TDEE" },
  { value: "lose_slow", label: "Lose weight slowly", desc: "−10% of your TDEE" },
  { value: "maintain", label: "Maintain", desc: "Normocaloric" },
  { value: "light_bulk", label: "Light bulk", desc: "+10% of your TDEE" },
  { value: "bulk", label: "Bulk", desc: "+20% of your TDEE" },
];

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "1-3 workouts/week" },
  { value: "moderate", label: "Moderate", desc: "3-5 workouts/week" },
  { value: "active", label: "Active", desc: "6-7 workouts/week" },
  { value: "very_active", label: "Very active", desc: "2x/day or physical job" },
];

/** Preset dieta con le percentuali Carb/Protein/Fat (mirror di DIET_PRESETS backend). */
export const DIET_PRESET_OPTIONS: {
  value: DietPreset;
  label: string;
  pct: MacroPercentages | null; // null = custom (percentuali libere)
}[] = [
  { value: "standard", label: "Standard", pct: { carbs_pct: 50, protein_pct: 20, fat_pct: 30 } },
  { value: "balanced", label: "Balanced", pct: { carbs_pct: 50, protein_pct: 25, fat_pct: 25 } },
  { value: "low_fat", label: "Low fat", pct: { carbs_pct: 60, protein_pct: 25, fat_pct: 15 } },
  { value: "high_protein", label: "High in protein", pct: { carbs_pct: 25, protein_pct: 40, fat_pct: 35 } },
  { value: "keto", label: "Ketogenic", pct: { carbs_pct: 5, protein_pct: 30, fat_pct: 65 } },
  { value: "custom", label: "Custom", pct: null },
];
