/**
 * Calcolatore TDEE & macro.
 *
 * BMR con formula di MIFFLIN-ST JEOR (la più accurata per la popolazione generale):
 *   uomo:  10*kg + 6.25*cm - 5*età + 5
 *   donna: 10*kg + 6.25*cm - 5*età - 161
 * TDEE = BMR * moltiplicatore di attività.
 * L'obiettivo (cut/bulk/maintain) scala il TDEE; i macro derivano dalle calorie
 * con priorità alle proteine (g/kg), poi grassi (% calorie), il resto carboidrati.
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "cut" | "bulk" | "maintain";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // poco/nessun esercizio
  light: 1.375, // 1-3 giorni/sett
  moderate: 1.55, // 3-5 giorni/sett
  active: 1.725, // 6-7 giorni/sett
  very_active: 1.9, // 2x/giorno o lavoro fisico
};

/** Scala il TDEE in base all'obiettivo. */
export const GOAL_FACTORS: Record<Goal, number> = {
  cut: 0.8, // deficit ~20%
  maintain: 1.0,
  bulk: 1.1, // surplus ~10%
};

/** Proteine target (g per kg di peso) di default, per obiettivo. Più alte in cut
 *  per preservare massa magra (utente di pesistica). */
export const DEFAULT_PROTEIN_PER_KG: Record<Goal, number> = {
  cut: 2.2,
  maintain: 2.0,
  bulk: 2.0,
};

/** Quota calorica di default dai grassi (frazione). Il resto va ai carboidrati. */
export const DEFAULT_FAT_PCT = 0.25;

export interface TdeeInput {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: Goal;
  /** Override opzionale delle proteine per kg. */
  proteinPerKg?: number;
  /** Override opzionale della % calorie dai grassi (0..1). */
  fatPct?: number;
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

export function computeBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export interface MacroSplit {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/**
 * Distribuisce le calorie in macro: proteine per kg (priorità), grassi % calorie,
 * carboidrati a saldo. Riusata dal calcolatore (3a) e dall'adattivo (3d).
 */
export function distributeMacros(
  calories: number,
  weightKg: number,
  goal: Goal,
  proteinPerKg?: number,
  fatPct?: number,
): MacroSplit {
  const ppk = proteinPerKg ?? DEFAULT_PROTEIN_PER_KG[goal];
  const fp = fatPct ?? DEFAULT_FAT_PCT;

  const protein_g = ppk * weightKg;
  const fat_g = (calories * fp) / 9; // 9 kcal/g
  const carbs_g = Math.max(0, (calories - protein_g * 4 - fat_g * 9) / 4); // 4 kcal/g
  return {
    protein_g: Math.round(protein_g),
    carbs_g: Math.round(carbs_g),
    fat_g: Math.round(fat_g),
  };
}

export function computeTargets(input: TdeeInput): TdeeResult {
  const bmr = computeBmr(input.weight_kg, input.height_cm, input.age, input.sex);
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activity_level];
  const calories = tdee * GOAL_FACTORS[input.goal];
  const macros = distributeMacros(
    calories,
    input.weight_kg,
    input.goal,
    input.proteinPerKg,
    input.fatPct,
  );

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    ...macros,
  };
}
