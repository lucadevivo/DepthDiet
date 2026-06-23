import { Router } from "express";
import {
  createCustomFood,
  deleteCustomFood,
  getAllCustomFoods,
  getCustomFoodById,
  searchCustomFoods,
  updateCustomFood,
  type CustomFoodInput,
} from "../repositories/customFoods.js";

export const foodsRouter = Router();

function nonNegNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
}
function optString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function validate(body: unknown): CustomFoodInput | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "body mancante" };
  const b = body as Record<string, unknown>;

  const name = optString(b.name);
  if (!name) return { error: "name richiesto" };

  const kcal = nonNegNum(b.kcal_per_100);
  const protein = nonNegNum(b.protein_per_100);
  const carbs = nonNegNum(b.carbs_per_100);
  const fat = nonNegNum(b.fat_per_100);
  if (kcal === null || protein === null || carbs === null || fat === null) {
    return { error: "macro per 100g non validi (numeri >= 0)" };
  }
  const serving = b.default_serving_g === undefined ? null : nonNegNum(b.default_serving_g);

  return {
    name,
    brand: optString(b.brand),
    barcode: optString(b.barcode),
    kcal_per_100: kcal,
    protein_per_100: protein,
    carbs_per_100: carbs,
    fat_per_100: fat,
    default_serving_g: serving,
  };
}

/** Lista o ricerca (?q=). */
foodsRouter.get("/", (req, res) => {
  const q = req.query.q;
  const foods = typeof q === "string" && q.trim() !== "" ? searchCustomFoods(q.trim()) : getAllCustomFoods();
  res.json(foods);
});

foodsRouter.post("/", (req, res) => {
  const v = validate(req.body);
  if ("error" in v) {
    res.status(400).json({ error: "bad_request", detail: v.error });
    return;
  }
  try {
    res.status(201).json(createCustomFood(v));
  } catch (err) {
    // Barcode già presente (indice univoco): import duplicato da Open Food Facts.
    if (err instanceof Error && /UNIQUE/i.test(err.message)) {
      res.status(409).json({ error: "duplicate_barcode", detail: "alimento con questo barcode già presente" });
      return;
    }
    throw err;
  }
});

foodsRouter.get("/:id", (req, res) => {
  const food = getCustomFoodById(Number(req.params.id));
  if (!food) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(food);
});

foodsRouter.put("/:id", (req, res) => {
  const v = validate(req.body);
  if ("error" in v) {
    res.status(400).json({ error: "bad_request", detail: v.error });
    return;
  }
  const updated = updateCustomFood(Number(req.params.id), v);
  if (!updated) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(updated);
});

foodsRouter.delete("/:id", (req, res) => {
  res.json({ deleted: deleteCustomFood(Number(req.params.id)) });
});
