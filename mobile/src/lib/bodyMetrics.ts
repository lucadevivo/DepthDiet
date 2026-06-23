import type { Profile, Sex } from "../types/profile";

/**
 * Metriche corporee calcolate lato client per popolare le card del Profilo
 * (BMR/BMI/Water) anche prima di un salvataggio. Mirror della formula
 * Mifflin-St Jeor usata dal backend.
 */

export function bmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

/** Indice di massa corporea: kg / m². */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** Categoria BMI (etichetta breve in inglese). */
export function bmiCategory(value: number): string {
  if (value < 18.5) return "Underweight";
  if (value < 25) return "Normal";
  if (value < 30) return "Overweight";
  return "Obese";
}

/** Fabbisogno idrico stimato: ~35 ml per kg di peso, arrotondato a 0.1 L. */
export function waterRequirementMl(weightKg: number): number {
  return Math.round((weightKg * 35) / 100) * 100;
}

export interface BodyMetrics {
  bmr: number;
  bmi: number;
  bmiCategory: string;
  waterMl: number;
}

/** Calcola tutte le metriche se il profilo ha i dati fisici, altrimenti null. */
export function bodyMetricsFromProfile(p: Profile | undefined): BodyMetrics | null {
  if (!p || p.weight_kg == null || p.height_cm == null || p.age == null || p.sex == null) {
    return null;
  }
  const b = bmi(p.weight_kg, p.height_cm);
  return {
    bmr: bmr(p.weight_kg, p.height_cm, p.age, p.sex),
    bmi: b,
    bmiCategory: bmiCategory(b),
    waterMl: waterRequirementMl(p.weight_kg),
  };
}
