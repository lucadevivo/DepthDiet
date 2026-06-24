import { Router } from "express";
import { addWater, getWaterByDate } from "../repositories/water.js";

export const waterRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/water?date=YYYY-MM-DD — totale acqua (ml) del giorno. */
waterRouter.get("/", (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "bad_request", detail: "date=YYYY-MM-DD richiesto" });
    return;
  }
  res.json(getWaterByDate(date));
});

/** POST /api/water { date, amount_ml } — applica una variazione (anche negativa). */
waterRouter.post("/", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const date = typeof b.date === "string" ? b.date : "";
  const amount = typeof b.amount_ml === "number" ? b.amount_ml : NaN;
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "bad_request", detail: "date=YYYY-MM-DD richiesto" });
    return;
  }
  if (!Number.isFinite(amount) || Math.abs(amount) > 5000) {
    res.status(400).json({ error: "bad_request", detail: "amount_ml non valido (±5000)" });
    return;
  }
  res.status(201).json(addWater(date, amount));
});
