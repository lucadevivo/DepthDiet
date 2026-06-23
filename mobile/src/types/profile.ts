/** Tipi del profilo/obiettivi (mirror di quelli del backend, Fase 3a). */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "cut" | "bulk" | "maintain";

export interface Profile {
  id: number;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
  goal: Goal | null;
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
}

export interface PutProfileResponse {
  profile: Profile;
  computation: { bmr: number; tdee: number };
}

// --- Etichette/opzioni per la UI ---

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "male", label: "Uomo" },
  { value: "female", label: "Donna" },
];

export const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "cut", label: "Cut" },
  { value: "maintain", label: "Normo" },
  { value: "bulk", label: "Bulk" },
];

export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentary", label: "Sedentario", desc: "Poco o nessun esercizio" },
  { value: "light", label: "Leggero", desc: "1-3 allenamenti/sett" },
  { value: "moderate", label: "Moderato", desc: "3-5 allenamenti/sett" },
  { value: "active", label: "Attivo", desc: "6-7 allenamenti/sett" },
  { value: "very_active", label: "Molto attivo", desc: "2x/giorno o lavoro fisico" },
];
