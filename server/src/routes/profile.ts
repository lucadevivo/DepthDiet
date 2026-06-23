import { Router } from "express";
import { computeTargets, type ActivityLevel, type Goal, type Sex } from "../services/tdee.js";
import { getProfile, updateProfile } from "../repositories/profile.js";

export const profileRouter = Router();

const SEXES: Sex[] = ["male", "female"];
const ACTIVITIES: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];
const GOALS: Goal[] = ["cut", "bulk", "maintain"];

interface ValidInput {
  weight_kg: number;
  height_cm: number;
  age: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal: Goal;
  proteinPerKg?: number;
  fatPct?: number;
}

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
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

  const input: ValidInput = {
    weight_kg,
    height_cm,
    age,
    sex: b.sex as Sex,
    activity_level: b.activity_level as ActivityLevel,
    goal: b.goal as Goal,
  };
  const proteinPerKg = num(b.proteinPerKg, 0.5, 4);
  if (proteinPerKg !== null) input.proteinPerKg = proteinPerKg;
  const fatPct = num(b.fatPct, 0.1, 0.6);
  if (fatPct !== null) input.fatPct = fatPct;
  return input;
}

/** Profilo + obiettivi correnti. */
profileRouter.get("/", (_req, res) => {
  res.json(getProfile());
});

/** Imposta i parametri fisici, calcola TDEE+macro (Mifflin-St Jeor) e li salva. */
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
    target_calories: targets.calories,
    target_protein_g: targets.protein_g,
    target_carbs_g: targets.carbs_g,
    target_fat_g: targets.fat_g,
  });

  // Restituiamo anche bmr/tdee per mostrarli nella UI (non sono persistiti).
  res.json({ profile, computation: { bmr: targets.bmr, tdee: targets.tdee } });
});
