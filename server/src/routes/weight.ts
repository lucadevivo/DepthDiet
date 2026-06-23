import { Router } from "express";
import { deleteWeight, listWeights, logWeight } from "../repositories/weight.js";
import { getProfile, updateProfileTargets } from "../repositories/profile.js";
import { computeAdaptive } from "../services/adaptiveTdee.js";
import { distributeMacros } from "../services/tdee.js";

export const weightRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/weight?days=90 — misure di peso (default ultimi 365 giorni). */
weightRouter.get("/", (req, res) => {
  const days = typeof req.query.days === "string" ? Number.parseInt(req.query.days, 10) : 365;
  res.json(listWeights(Number.isFinite(days) ? days : 365));
});

/** POST /api/weight { date, weight_kg } — registra/aggiorna il peso del giorno. */
weightRouter.post("/", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const date = typeof b.date === "string" ? b.date : "";
  const weight = typeof b.weight_kg === "number" ? b.weight_kg : NaN;
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "bad_request", detail: "date=YYYY-MM-DD richiesto" });
    return;
  }
  if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
    res.status(400).json({ error: "bad_request", detail: "weight_kg non valido (20-400)" });
    return;
  }
  res.status(201).json(logWeight(date, weight));
});

/** GET /api/weight/adaptive — trend del peso + suggerimento calorico adattivo. */
weightRouter.get("/adaptive", (_req, res) => {
  const profile = getProfile();
  if (!profile.goal) {
    res.status(400).json({ error: "no_goal", detail: "imposta prima gli obiettivi" });
    return;
  }
  res.json(computeAdaptive(listWeights(), profile.goal, profile.target_calories));
});

/** POST /api/weight/adaptive/apply — applica le calorie suggerite e ribilancia i macro. */
weightRouter.post("/adaptive/apply", (_req, res) => {
  const profile = getProfile();
  if (!profile.goal || profile.weight_kg == null) {
    res.status(400).json({ error: "no_goal", detail: "profilo incompleto" });
    return;
  }
  const suggestion = computeAdaptive(listWeights(), profile.goal, profile.target_calories);
  if (!suggestion.hasEnoughData || suggestion.adjustmentKcal === 0 || suggestion.suggestedTargetCalories == null) {
    res.status(409).json({ error: "no_adjustment", detail: suggestion.reason });
    return;
  }
  const macros = distributeMacros(suggestion.suggestedTargetCalories, profile.weight_kg, profile.goal);
  const updated = updateProfileTargets({
    target_calories: suggestion.suggestedTargetCalories,
    target_protein_g: macros.protein_g,
    target_carbs_g: macros.carbs_g,
    target_fat_g: macros.fat_g,
  });
  res.json({ profile: updated, applied: suggestion.adjustmentKcal });
});

weightRouter.delete("/:id", (req, res) => {
  res.json({ deleted: deleteWeight(Number(req.params.id)) });
});
