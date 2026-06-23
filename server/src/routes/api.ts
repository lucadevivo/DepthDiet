import { Router, type Request, type Response } from "express";
import {
  analyzeMeal,
  GeminiNotConfiguredError,
  GeminiParseError,
} from "../services/gemini/client.js";
import type { AnalyzeInput } from "../services/gemini/types.js";
import { profileRouter } from "./profile.js";
import { foodsRouter } from "./foods.js";
import { recipesRouter } from "./recipes.js";
import { diaryRouter } from "./diary.js";
import { offRouter } from "./off.js";
import { weightRouter } from "./weight.js";

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

// Fase 3c — Open Food Facts (ricerca + barcode).
apiRouter.use("/off", offRouter);

// Fase 3d — Peso & TDEE adattivo.
apiRouter.use("/weight", weightRouter);

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
  if (typeof b.contextText === "string") input.contextText = b.contextText;
  if (
    typeof b.depth === "object" &&
    b.depth !== null &&
    typeof (b.depth as Record<string, unknown>).volumeMl === "number"
  ) {
    input.depth = { volumeMl: (b.depth as { volumeMl: number }).volumeMl };
  }
  return input;
}

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
