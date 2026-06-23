import { Router } from "express";
import {
  createMeal,
  deleteMeal,
  listMeals,
  renameMeal,
  reorderMeals,
} from "../repositories/meals.js";

export const mealsRouter = Router();

const MAX_NAME = 40;

/** Valida e normalizza un nome pasto. */
function parseName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const name = v.trim();
  if (name.length === 0 || name.length > MAX_NAME) return null;
  return name;
}

/** GET /api/meals — elenco pasti ordinato. */
mealsRouter.get("/", (_req, res) => {
  res.json(listMeals());
});

/** POST /api/meals { name } — crea un pasto in coda. */
mealsRouter.post("/", (req, res) => {
  const name = parseName((req.body as Record<string, unknown>)?.name);
  if (name === null) {
    res.status(400).json({ error: "bad_request", detail: `name richiesto (1-${MAX_NAME} caratteri)` });
    return;
  }
  res.status(201).json(createMeal(name));
});

/** PUT /api/meals/reorder { ids: number[] } — riordina i pasti. */
mealsRouter.put("/reorder", (req, res) => {
  const ids = (req.body as Record<string, unknown>)?.ids;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === "number" && Number.isInteger(x))) {
    res.status(400).json({ error: "bad_request", detail: "ids: array di interi richiesto" });
    return;
  }
  res.json(reorderMeals(ids));
});

/** PUT /api/meals/:id { name } — rinomina. */
mealsRouter.put("/:id", (req, res) => {
  const name = parseName((req.body as Record<string, unknown>)?.name);
  if (name === null) {
    res.status(400).json({ error: "bad_request", detail: `name richiesto (1-${MAX_NAME} caratteri)` });
    return;
  }
  const meal = renameMeal(Number(req.params.id), name);
  if (!meal) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(meal);
});

/** DELETE /api/meals/:id — le voci di diario collegate finiscono in "Other". */
mealsRouter.delete("/:id", (req, res) => {
  res.json({ deleted: deleteMeal(Number(req.params.id)) });
});
