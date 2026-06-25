import { Router } from "express";
import { getCreatineByDate, setCreatine } from "../repositories/creatine.js";

export const creatineRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/creatine?date=YYYY-MM-DD — flag creatina del giorno. */
creatineRouter.get("/", (req, res) => {
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "bad_request", detail: "date=YYYY-MM-DD richiesto" });
    return;
  }
  res.json(getCreatineByDate(date));
});

/** POST /api/creatine { date, taken } — imposta il flag del giorno. */
creatineRouter.post("/", (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const date = typeof b.date === "string" ? b.date : "";
  const taken = b.taken === true;
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "bad_request", detail: "date=YYYY-MM-DD richiesto" });
    return;
  }
  res.status(201).json(setCreatine(date, taken));
});
