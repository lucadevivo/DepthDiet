import { Router, type Request, type Response } from "express";
import {
  analyzeMeal,
  GeminiNotConfiguredError,
  GeminiParseError,
  statusOf,
} from "../services/gemini/client.js";
import { suggestMeal } from "../services/gemini/suggest.js";
import type {
  AnalyzeInput,
  DepthQuality,
  ReferenceType,
} from "../services/gemini/types.js";
import { getDiaryByDate } from "../repositories/diary.js";
import { getProfile } from "../repositories/profile.js";
import { getAllCustomFoods } from "../repositories/customFoods.js";
import { getAllRecipes } from "../repositories/recipes.js";
import type { Macros } from "../services/nutrition.js";
import { profileRouter } from "./profile.js";
import { foodsRouter } from "./foods.js";
import { recipesRouter } from "./recipes.js";
import { diaryRouter } from "./diary.js";
import { mealsRouter } from "./meals.js";
import { offRouter } from "./off.js";
import { weightRouter } from "./weight.js";
import { waterRouter } from "./water.js";
import { creatineRouter } from "./creatine.js";

/**
 * Router delle rotte APPLICATIVE protette. Montato dietro requireAuth in app.ts.
 */
export const apiRouter = Router();

// Endpoint di test dell'auth: raggiungibile solo con token valido.
apiRouter.get("/ping", (_req, res) => {
  res.json({ ok: true, pong: new Date().toISOString() });
});

// Fase 3a — Calcolatore obiettivi & profilo.
apiRouter.use("/profile", profileRouter);

// Fase 3b — Alimenti Personali, Ricette, Diario.
apiRouter.use("/foods", foodsRouter);
apiRouter.use("/recipes", recipesRouter);
apiRouter.use("/diary", diaryRouter);

// F3 — Pasti personalizzati.
apiRouter.use("/meals", mealsRouter);

// Fase 3c — Open Food Facts (ricerca + barcode).
apiRouter.use("/off", offRouter);

// Fase 3d — Peso & TDEE adattivo.
apiRouter.use("/weight", weightRouter);

// Acqua: contatore giornaliero persistente (water_log).
apiRouter.use("/water", waterRouter);

// Creatina: flag giornaliero "presa/non presa" (creatine_log).
apiRouter.use("/creatine", creatineRouter);

/** Estrae una misura volumetrica valida ({ volumeMl, quality? }) o undefined. */
function parseDepth(raw: unknown): { volumeMl: number; quality?: DepthQuality } | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const d = raw as Record<string, unknown>;
  if (typeof d.volumeMl !== "number" || !Number.isFinite(d.volumeMl) || d.volumeMl <= 0) {
    return undefined;
  }
  const depth: { volumeMl: number; quality?: DepthQuality } = { volumeMl: d.volumeMl };
  if (DEPTH_QUALITIES.includes(d.quality as DepthQuality)) {
    depth.quality = d.quality as DepthQuality;
  }
  return depth;
}

/** Validazione minima del corpo della richiesta di analisi. */
function parseAnalyzeBody(body: unknown): AnalyzeInput | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "body mancante" };
  const b = body as Record<string, unknown>;

  if (typeof b.imageBase64 !== "string" || b.imageBase64.length === 0) {
    return { error: "imageBase64 richiesto" };
  }
  if (typeof b.mimeType !== "string" || !b.mimeType.startsWith("image/")) {
    return { error: "mimeType immagine richiesto (es. image/jpeg)" };
  }
  const input: AnalyzeInput = { imageBase64: b.imageBase64, mimeType: b.mimeType };
  // Viste aggiuntive dello stesso pasto (max 4): scarta voci malformate.
  // Ognuna può portare la propria misura volumetrica LiDAR.
  if (Array.isArray(b.extraImages)) {
    const extras: NonNullable<AnalyzeInput["extraImages"]> = [];
    for (const raw of b.extraImages) {
      if (typeof raw !== "object" || raw === null) continue;
      const e = raw as Record<string, unknown>;
      if (
        typeof e.imageBase64 === "string" &&
        e.imageBase64.length > 0 &&
        typeof e.mimeType === "string" &&
        e.mimeType.startsWith("image/")
      ) {
        const depth = parseDepth(e.depth);
        extras.push({
          imageBase64: e.imageBase64,
          mimeType: e.mimeType,
          ...(depth ? { depth } : {}),
        });
      }
      if (extras.length >= 4) break;
    }
    if (extras.length > 0) input.extraImages = extras;
  }
  if (typeof b.contextText === "string") input.contextText = b.contextText;
  const depth = parseDepth(b.depth);
  if (depth) input.depth = depth;
  if (typeof b.reference === "object" && b.reference !== null) {
    const r = b.reference as Record<string, unknown>;
    if (REFERENCE_TYPES.includes(r.type as ReferenceType)) {
      input.reference = { type: r.type as ReferenceType };
    }
  }
  return input;
}

const DEPTH_QUALITIES: DepthQuality[] = ["high", "medium", "low"];
const REFERENCE_TYPES: ReferenceType[] = ["card_iso", "coin_1eur", "coin_2eur"];

/**
 * Scanner IA: riceve immagine (+ testo + depth opzionali), chiama Gemini con
 * structured output e match dal DB, restituisce calorie/macro stimati.
 */
apiRouter.post("/analyze", async (req: Request, res: Response) => {
  const parsed = parseAnalyzeBody(req.body);
  if ("error" in parsed) {
    res.status(400).json({ error: "bad_request", detail: parsed.error });
    return;
  }

  try {
    const result = await analyzeMeal(parsed);
    res.json(result);
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      res.status(503).json({ error: "gemini_not_configured" });
      return;
    }
    if (err instanceof GeminiParseError) {
      res.status(502).json({ error: "gemini_bad_response", detail: err.message });
      return;
    }
    // Errori di rete/quota dell'API Gemini.
    console.error("[analyze] errore Gemini:", err);
    res.status(502).json({ error: "gemini_request_failed" });
  }
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Suggeritore IA: dato il giorno, calcola i macro mancanti per l'obiettivo e
 * chiede a Gemini cosa mangiare. `onlyLibrary` limita i consigli agli Alimenti/
 * Ricette già salvati dall'utente.
 */
apiRouter.post("/suggest", async (req: Request, res: Response) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const date = typeof b.date === "string" ? b.date : "";
  if (!DATE_RE.test(date)) {
    res.status(400).json({ error: "bad_request", detail: "date=YYYY-MM-DD richiesto" });
    return;
  }
  const onlyLibrary = b.onlyLibrary === true;
  const note = typeof b.note === "string" ? b.note.slice(0, 500) : undefined;

  const profile = getProfile();
  if (profile?.target_calories == null) {
    res.status(400).json({ error: "no_targets", detail: "imposta prima il profilo/obiettivi" });
    return;
  }

  const day = getDiaryByDate(date);
  const remaining: Macros = {
    kcal: Math.max(0, (profile.target_calories ?? 0) - day.totals.kcal),
    protein_g: Math.max(0, (profile.target_protein_g ?? 0) - day.totals.protein_g),
    carbs_g: Math.max(0, (profile.target_carbs_g ?? 0) - day.totals.carbs_g),
    fat_g: Math.max(0, (profile.target_fat_g ?? 0) - day.totals.fat_g),
  };

  try {
    const result = await suggestMeal({
      remaining,
      onlyLibrary,
      note,
      foods: getAllCustomFoods(),
      recipes: getAllRecipes(),
    });
    res.json({ ...result, remaining });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      res.status(503).json({ error: "gemini_not_configured" });
      return;
    }
    // Rate limit del free tier: lo distinguiamo così l'app può dire "riprova tra poco".
    if (statusOf(err) === 429) {
      res.status(429).json({ error: "gemini_rate_limited" });
      return;
    }
    console.error("[suggest] errore Gemini:", err);
    res.status(502).json({ error: "gemini_request_failed" });
  }
});
