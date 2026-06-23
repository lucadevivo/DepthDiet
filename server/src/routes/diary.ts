import { Router } from "express";
import {
  addDiaryEntry,
  deleteDiaryEntry,
  getDiaryByDate,
  type Meal,
  type NewDiaryEntry,
} from "../repositories/diary.js";
import { getCustomFoodById } from "../repositories/customFoods.js";
import { getRecipeById } from "../repositories/recipes.js";
import { scaleFood, type Macros } from "../services/nutrition.js";

export const diaryRouter = Router();

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const round = (n: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/** GET /api/diary?date=YYYY-MM-DD — voci + totali della giornata. */
diaryRouter.get("/", (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "bad_request", detail: "date=YYYY-MM-DD richiesto" });
    return;
  }
  res.json(getDiaryByDate(date));
});

/**
 * POST /api/diary — aggiunge una voce. Tre modalità:
 *   { date, meal, type:'custom_food', food_id, grams }
 *   { date, meal, type:'recipe', recipe_id, multiplier? }
 *   { date, meal, type:'manual', description, kcal, protein_g, carbs_g, fat_g, grams? }
 *   { date, meal, type:'scan',   ...come manual (source 'scan', Scanner IA) }
 * I macro vengono calcolati lato server e salvati come snapshot.
 */
diaryRouter.post("/", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;

  const date = typeof b.date === "string" ? b.date : "";
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "bad_request", detail: "date=YYYY-MM-DD richiesto" });
    return;
  }
  if (!MEALS.includes(b.meal as Meal)) {
    res.status(400).json({ error: "bad_request", detail: "meal non valido" });
    return;
  }
  const meal = b.meal as Meal;

  let entry: NewDiaryEntry | { error: string };

  switch (b.type) {
    case "custom_food":
      entry = buildFromFood(date, meal, b);
      break;
    case "recipe":
      entry = buildFromRecipe(date, meal, b);
      break;
    case "manual":
      entry = buildManual(date, meal, b);
      break;
    case "scan":
      // Voce dallo Scanner IA (Fase 4a): stessi campi del manuale, source distinta.
      entry = buildManual(date, meal, b);
      if (!("error" in entry)) entry.source = "scan";
      break;
    default:
      entry = { error: "type non valido (custom_food|recipe|manual)" };
  }

  if ("error" in entry) {
    res.status(400).json({ error: "bad_request", detail: entry.error });
    return;
  }
  res.status(201).json(addDiaryEntry(entry));
});

diaryRouter.delete("/:id", (req, res) => {
  res.json({ deleted: deleteDiaryEntry(Number(req.params.id)) });
});

// --- builder per tipo ---

function buildFromFood(date: string, meal: Meal, b: Record<string, unknown>): NewDiaryEntry | { error: string } {
  const foodId = typeof b.food_id === "number" ? b.food_id : NaN;
  const grams = typeof b.grams === "number" ? b.grams : NaN;
  if (!Number.isFinite(foodId) || !Number.isFinite(grams) || grams <= 0) {
    return { error: "food_id e grams (>0) richiesti" };
  }
  const food = getCustomFoodById(foodId);
  if (!food) return { error: "food_id inesistente" };
  return {
    entry_date: date,
    meal,
    source: "custom_food",
    custom_food_id: food.id,
    recipe_id: null,
    description: food.name,
    grams,
    macros: scaleFood(food, grams),
  };
}

function buildFromRecipe(date: string, meal: Meal, b: Record<string, unknown>): NewDiaryEntry | { error: string } {
  const recipeId = typeof b.recipe_id === "number" ? b.recipe_id : NaN;
  if (!Number.isFinite(recipeId)) return { error: "recipe_id richiesto" };
  const recipe = getRecipeById(recipeId);
  if (!recipe) return { error: "recipe_id inesistente" };
  const mult = typeof b.multiplier === "number" && b.multiplier > 0 ? b.multiplier : 1;
  const t = recipe.totals;
  const macros: Macros = {
    kcal: round(t.kcal * mult, 0),
    protein_g: round(t.protein_g * mult),
    carbs_g: round(t.carbs_g * mult),
    fat_g: round(t.fat_g * mult),
  };
  return {
    entry_date: date,
    meal,
    source: "recipe",
    custom_food_id: null,
    recipe_id: recipe.id,
    description: recipe.name,
    grams: round(recipe.total_grams * mult, 0),
    macros,
  };
}

function buildManual(date: string, meal: Meal, b: Record<string, unknown>): NewDiaryEntry | { error: string } {
  const description = typeof b.description === "string" && b.description.trim() !== "" ? b.description.trim() : null;
  if (!description) return { error: "description richiesta" };
  const n = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  const kcal = n(b.kcal);
  const protein_g = n(b.protein_g);
  const carbs_g = n(b.carbs_g);
  const fat_g = n(b.fat_g);
  if (kcal === null || protein_g === null || carbs_g === null || fat_g === null) {
    return { error: "kcal/protein_g/carbs_g/fat_g richiesti (>= 0)" };
  }
  const grams = b.grams === undefined ? null : n(b.grams);
  return {
    entry_date: date,
    meal,
    source: "manual",
    custom_food_id: null,
    recipe_id: null,
    description,
    grams,
    macros: { kcal, protein_g, carbs_g, fat_g },
  };
}
