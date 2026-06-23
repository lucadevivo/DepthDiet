/**
 * Calcolatore TDEE & macro.
 *
 * BMR con formula di MIFFLIN-ST JEOR (la più accurata per la popolazione generale):
 *   uomo:  10*kg + 6.25*cm - 5*età + 5
 *   donna: 10*kg + 6.25*cm - 5*età - 161
 * TDEE = BMR * moltiplicatore di attività.
 * L'obiettivo scala il TDEE in calorie obiettivo; i macro derivano dalle calorie
 * tramite il PRESET DIETA scelto (percentuali Carbo/Proteine/Grassi).
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

/** Obiettivo a 5 livelli: scala il TDEE di −20/−10/0/+10/+20%. */
export type Goal = "lose_weight" | "lose_slow" | "maintain" | "light_bulk" | "bulk";

/** Preset di ripartizione dei macro (percentuali sulle calorie). 'custom' = libero. */
export type DietPreset = "standard" | "balanced" | "low_fat" | "high_protein" | "keto" | "custom";

/** Formula di calcolo del BMR. */
export type Formula = "mifflin" | "harris_benedict" | "katch_mcardle";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // poco/nessun esercizio
  light: 1.375, // 1-3 giorni/sett
  moderate: 1.55, // 3-5 giorni/sett
  active: 1.725, // 6-7 giorni/sett
  very_active: 1.9, // 2x/giorno o lavoro fisico
};

/** Scala il TDEE in base all'obiettivo. */
export const GOAL_FACTORS: Record<Goal, number> = {
  lose_weight: 0.8, // deficit ~20%
  lose_slow: 0.9, // deficit ~10%
  maintain: 1.0,
  light_bulk: 1.1, // surplus ~10%
  bulk: 1.2, // surplus ~20%
};

/** Percentuali macro per preset: { carbs, protein, fat }, sommano a 100. */
export const DIET_PRESETS: Record<Exclude<DietPreset, "custom">, MacroPercentages> = {
  standard: { carbs_pct: 50, protein_pct: 20, fat_pct: 30 },
  balanced: { carbs_pct: 50, protein_pct: 25, fat_pct: 25 },
  low_fat: { carbs_pct: 60, protein_pct: 25, fat_pct: 15 },
  high_protein: { carbs_pct: 25, protein_pct: 40, fat_pct: 35 },
  keto: { carbs_pct: 5, protein_pct: 30, fat_pct: 65 },
};

export interface MacroPercentages {
  carbs_pct: number;
  protein_pct: number;
  fat_pct: number;
}

export interface MacroSplit {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface TdeeInput {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: Goal;
  diet_preset: DietPreset;
  /** Percentuali custom (usate solo se diet_preset === 'custom'). */
  custom_pct?: MacroPercentages;
  /** Formula BMR (default 'mifflin'). */
  formula?: Formula;
  /** % di grasso corporeo: serve solo per Katch-McArdle. */
  body_fat_pct?: number | null;
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
  /** Calorie obiettivo (TDEE scalato per l'obiettivo). */
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/**
 * BMR con la formula scelta. Mifflin-St Jeor di default. Katch-McArdle usa la
 * massa magra (da body_fat_pct); se non disponibile, ripiega su Mifflin.
 */
export function computeBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  formula: Formula = "mifflin",
  bodyFatPct?: number,
): number {
  switch (formula) {
    case "harris_benedict":
      // Revisione 1984 di Roza & Shizgal.
      return sex === "male"
        ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
        : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
    case "katch_mcardle": {
      if (bodyFatPct == null) break; // niente body fat → fallback Mifflin
      const lbm = weightKg * (1 - bodyFatPct / 100);
      return 370 + 21.6 * lbm;
    }
    default:
      break;
  }
  // Mifflin-St Jeor (default e fallback).
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Risolve le percentuali effettive: dal preset, oppure quelle custom. */
export function resolvePercentages(
  preset: DietPreset,
  customPct?: MacroPercentages,
): MacroPercentages {
  if (preset === "custom") return customPct ?? DIET_PRESETS.standard;
  return DIET_PRESETS[preset];
}

/**
 * Distribuisce le calorie in macro a partire dalle percentuali del preset dieta.
 * 4 kcal/g per proteine e carbo, 9 kcal/g per i grassi.
 */
export function macrosFromCalories(calories: number, pct: MacroPercentages): MacroSplit {
  return {
    protein_g: Math.round((calories * (pct.protein_pct / 100)) / 4),
    carbs_g: Math.round((calories * (pct.carbs_pct / 100)) / 4),
    fat_g: Math.round((calories * (pct.fat_pct / 100)) / 9),
  };
}

export function computeTargets(input: TdeeInput): TdeeResult {
  const bmr = computeBmr(
    input.weight_kg,
    input.height_cm,
    input.age,
    input.sex,
    input.formula ?? "mifflin",
    input.body_fat_pct ?? undefined,
  );
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activity_level];
  const calories = tdee * GOAL_FACTORS[input.goal];
  const macros = macrosFromCalories(calories, resolvePercentages(input.diet_preset, input.custom_pct));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    ...macros,
  };
}
