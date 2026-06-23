import { Router } from "express";
import {
  computeTargets,
  macrosFromCalories,
  resolvePercentages,
  type ActivityLevel,
  type DietPreset,
  type Formula,
  type Goal,
  type MacroPercentages,
  type Sex,
} from "../services/tdee.js";
import {
  getProfile,
  updateProfile,
  updateProfileDiet,
  updateProfileFormula,
} from "../repositories/profile.js";

export const profileRouter = Router();

const SEXES: Sex[] = ["male", "female"];
const ACTIVITIES: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const GOALS: Goal[] = ["lose_weight", "lose_slow", "maintain", "light_bulk", "bulk"];
const PRESETS: DietPreset[] = ["standard", "balanced", "low_fat", "high_protein", "keto", "custom"];
const FORMULAS: Formula[] = ["mifflin", "harris_benedict", "katch_mcardle"];

interface ValidInput {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: Goal;
  diet_preset: DietPreset;
  custom_pct?: MacroPercentages;
  formula: Formula;
  body_fat_pct: number | null;
}

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

/** Percentuali custom valide: 3 interi 0-100 che sommano (circa) a 100. */
function parseCustomPct(v: unknown): MacroPercentages | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const carbs_pct = num(o.carbs_pct, 0, 100);
  const protein_pct = num(o.protein_pct, 0, 100);
  const fat_pct = num(o.fat_pct, 0, 100);
  if (carbs_pct === null || protein_pct === null || fat_pct === null) return null;
  if (Math.abs(carbs_pct + protein_pct + fat_pct - 100) > 1) return null;
  return { carbs_pct, protein_pct, fat_pct };
}

/** Estrae il preset (default 'standard') e le eventuali % custom dal body. */
function parseDiet(b: Record<string, unknown>): { diet_preset: DietPreset; custom_pct?: MacroPercentages } | { error: string } {
  const preset = (b.diet_preset ?? "standard") as DietPreset;
  if (!PRESETS.includes(preset)) return { error: "diet_preset non valido" };
  if (preset === "custom") {
    const custom_pct = parseCustomPct(b.custom_pct);
    if (custom_pct === null) return { error: "custom_pct non valido (3 interi 0-100 che sommano a 100)" };
    return { diet_preset: preset, custom_pct };
  }
  return { diet_preset: preset };
}

/** Valida e normalizza il corpo del PUT /profile. */
function validate(body: unknown): ValidInput | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "body mancante" };
  const b = body as Record<string, unknown>;

  const weight_kg = num(b.weight_kg, 20, 400);
  if (weight_kg === null) return { error: "weight_kg non valido (20-400)" };
  const height_cm = num(b.height_cm, 80, 260);
  if (height_cm === null) return { error: "height_cm non valido (80-260)" };
  const age = num(b.age, 10, 120);
  if (age === null) return { error: "age non valido (10-120)" };
  if (!SEXES.includes(b.sex as Sex)) return { error: "sex non valido" };
  if (!ACTIVITIES.includes(b.activity_level as ActivityLevel))
    return { error: "activity_level non valido" };
  if (!GOALS.includes(b.goal as Goal)) return { error: "goal non valido" };

  const diet = parseDiet(b);
  if ("error" in diet) return diet;

  const formula = (b.formula ?? "mifflin") as Formula;
  if (!FORMULAS.includes(formula)) return { error: "formula non valida" };
  const body_fat_pct = num(b.body_fat_pct, 1, 70);

  return {
    weight_kg,
    height_cm,
    age,
    sex: b.sex as Sex,
    activity_level: b.activity_level as ActivityLevel,
    goal: b.goal as Goal,
    ...diet,
    formula,
    body_fat_pct,
  };
}

/** Profilo + obiettivi correnti. */
profileRouter.get("/", (_req, res) => {
  res.json(getProfile());
});

/** Imposta i parametri fisici, calcola TDEE+macro (Mifflin-St Jeor + preset) e li salva. */
profileRouter.put("/", (req, res) => {
  const v = validate(req.body);
  if ("error" in v) {
    res.status(400).json({ error: "bad_request", detail: v.error });
    return;
  }

  const targets = computeTargets(v);
  const profile = updateProfile({
    weight_kg: v.weight_kg,
    height_cm: v.height_cm,
    age: v.age,
    sex: v.sex,
    activity_level: v.activity_level,
    goal: v.goal,
    diet_preset: v.diet_preset,
    diet_carbs_pct: v.custom_pct?.carbs_pct ?? null,
    diet_protein_pct: v.custom_pct?.protein_pct ?? null,
    diet_fat_pct: v.custom_pct?.fat_pct ?? null,
    formula: v.formula,
    body_fat_pct: v.body_fat_pct,
    target_calories: targets.calories,
    target_protein_g: targets.protein_g,
    target_carbs_g: targets.carbs_g,
    target_fat_g: targets.fat_g,
  });

  // Restituiamo anche bmr/tdee per mostrarli nella UI (non sono persistiti).
  res.json({ profile, computation: { bmr: targets.bmr, tdee: targets.tdee } });
});

/** Cambia SOLO il preset dieta: ricalcola i macro dalle calorie obiettivo già salvate. */
profileRouter.put("/diet", (req, res) => {
  const current = getProfile();
  if (current.target_calories == null) {
    res.status(409).json({ error: "no_targets", detail: "Imposta prima gli obiettivi nel Profilo." });
    return;
  }
  const b = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
  const diet = parseDiet(b);
  if ("error" in diet) {
    res.status(400).json({ error: "bad_request", detail: diet.error });
    return;
  }

  const pct = resolvePercentages(diet.diet_preset, diet.custom_pct);
  const macros = macrosFromCalories(current.target_calories, pct);
  const profile = updateProfileDiet({
    diet_preset: diet.diet_preset,
    diet_carbs_pct: diet.custom_pct?.carbs_pct ?? null,
    diet_protein_pct: diet.custom_pct?.protein_pct ?? null,
    diet_fat_pct: diet.custom_pct?.fat_pct ?? null,
    target_protein_g: macros.protein_g,
    target_carbs_g: macros.carbs_g,
    target_fat_g: macros.fat_g,
  });
  res.json({ profile });
});

/** Cambia la formula BMR (+ body fat): ricalcola BMR/TDEE/obiettivi dal profilo salvato. */
profileRouter.put("/formula", (req, res) => {
  const p = getProfile();
  if (
    p.weight_kg == null ||
    p.height_cm == null ||
    p.age == null ||
    p.sex == null ||
    p.activity_level == null ||
    p.goal == null
  ) {
    res.status(409).json({ error: "incomplete_profile", detail: "Completa prima il Profilo." });
    return;
  }
  const b = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<string, unknown>;
  const formula = (b.formula ?? "mifflin") as Formula;
  if (!FORMULAS.includes(formula)) {
    res.status(400).json({ error: "bad_request", detail: "formula non valida" });
    return;
  }
  const body_fat_pct = num(b.body_fat_pct, 1, 70);
  if (formula === "katch_mcardle" && body_fat_pct === null) {
    res.status(400).json({ error: "bad_request", detail: "body_fat_pct (1-70) richiesto per Katch-McArdle" });
    return;
  }

  const targets = computeTargets({
    weight_kg: p.weight_kg,
    height_cm: p.height_cm,
    age: p.age,
    sex: p.sex,
    activity_level: p.activity_level,
    goal: p.goal,
    diet_preset: p.diet_preset,
    custom_pct:
      p.diet_carbs_pct != null
        ? {
            carbs_pct: p.diet_carbs_pct,
            protein_pct: p.diet_protein_pct ?? 0,
            fat_pct: p.diet_fat_pct ?? 0,
          }
        : undefined,
    formula,
    body_fat_pct: body_fat_pct ?? undefined,
  });
  const profile = updateProfileFormula({
    formula,
    body_fat_pct,
    target_calories: targets.calories,
    target_protein_g: targets.protein_g,
    target_carbs_g: targets.carbs_g,
    target_fat_g: targets.fat_g,
  });
  res.json({ profile, computation: { bmr: targets.bmr, tdee: targets.tdee } });
});
