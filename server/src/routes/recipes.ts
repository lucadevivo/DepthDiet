import { Router } from "express";
import {
  allFoodsExist,
  createRecipe,
  deleteRecipe,
  getAllRecipes,
  getRecipeById,
  updateRecipe,
  type RecipeItemInput,
} from "../repositories/recipes.js";

export const recipesRouter = Router();

interface ValidRecipe {
  name: string;
  items: RecipeItemInput[];
}

function validate(body: unknown): ValidRecipe | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "body mancante" };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "name richiesto" };

  if (!Array.isArray(b.items) || b.items.length === 0) {
    return { error: "items richiesti (almeno uno)" };
  }
  const items: RecipeItemInput[] = [];
  for (const raw of b.items) {
    if (typeof raw !== "object" || raw === null) return { error: "item non valido" };
    const it = raw as Record<string, unknown>;
    const food_id = typeof it.food_id === "number" ? it.food_id : NaN;
    const grams = typeof it.grams === "number" ? it.grams : NaN;
    if (!Number.isFinite(food_id) || !Number.isFinite(grams) || grams <= 0) {
      return { error: "item: food_id e grams (>0) richiesti" };
    }
    items.push({ food_id, grams });
  }
  if (!allFoodsExist(items)) return { error: "uno o più food_id non esistono" };
  return { name, items };
}

recipesRouter.get("/", (_req, res) => {
  res.json(getAllRecipes());
});

recipesRouter.post("/", (req, res) => {
  const v = validate(req.body);
  if ("error" in v) {
    res.status(400).json({ error: "bad_request", detail: v.error });
    return;
  }
  res.status(201).json(createRecipe(v.name, v.items));
});

recipesRouter.get("/:id", (req, res) => {
  const recipe = getRecipeById(Number(req.params.id));
  if (!recipe) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(recipe);
});

recipesRouter.put("/:id", (req, res) => {
  const v = validate(req.body);
  if ("error" in v) {
    res.status(400).json({ error: "bad_request", detail: v.error });
    return;
  }
  const updated = updateRecipe(Number(req.params.id), v.name, v.items);
  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(updated);
});

recipesRouter.delete("/:id", (req, res) => {
  res.json({ deleted: deleteRecipe(Number(req.params.id)) });
});
