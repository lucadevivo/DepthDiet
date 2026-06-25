import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { getAllCustomFoods, type CustomFood } from "../../repositories/customFoods.js";
import { matchFoodsInContext } from "./foodMatch.js";
import { buildMealPrompt } from "./prompt.js";
import { mealAnalysisSchema } from "./schema.js";
import type { AnalyzeInput, AnalyzeResult, MealAnalysis, MealItem } from "./types.js";

/** Gemini non configurato (manca GEMINI_API_KEY) → l'endpoint risponde 503. */
export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY non configurato");
    this.name = "GeminiNotConfiguredError";
  }
}

/** Risposta del modello non interpretabile come JSON valido → 502. */
export class GeminiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiParseError";
  }
}

let client: GoogleGenAI | null = null;
export function getClient(): GoogleGenAI {
  if (!env.gemini.enabled) throw new GeminiNotConfiguredError();
  if (!client) client = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  return client;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Status transitori per cui ha senso ritentare (rate-limit / sovraccarico del modello). */
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err
    ? (err as { status?: number }).status
    : undefined;
}

/**
 * Ritenta una chiamata su errori transitori, con backoff esponenziale.
 * Il free tier di Gemini risponde 429 (rate limit) o 503 (alta domanda) abbastanza
 * spesso: senza retry l'esperienza sarebbe fragile.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = statusOf(err);
      if (status === undefined || !RETRYABLE_STATUS.has(status) || i === attempts - 1) {
        throw err;
      }
      const backoffMs = 1000 * 2 ** i;
      console.warn(`[gemini] errore ${status}, retry tra ${backoffMs}ms (${i + 1}/${attempts})`);
      await sleep(backoffMs);
    }
  }
  throw lastErr;
}

const round = (n: number, decimals = 0): number => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/** Estrae il JSON dalla risposta, con fallback se il modello aggiunge testo attorno. */
function parseAnalysis(text: string | undefined): MealAnalysis {
  if (!text) throw new GeminiParseError("risposta vuota dal modello");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new GeminiParseError("nessun JSON nella risposta");
    try {
      raw = JSON.parse(match[0]);
    } catch {
      throw new GeminiParseError("JSON malformato nella risposta");
    }
  }
  if (typeof raw !== "object" || raw === null || !Array.isArray((raw as MealAnalysis).items)) {
    throw new GeminiParseError("struttura JSON inattesa (manca 'items')");
  }
  return raw as MealAnalysis;
}

/**
 * Normalizza un item del modello e, se abbinato a un Alimento Personale,
 * RICALCOLA i macro dai valori reali del DB scalati sui grammi: così i numeri
 * certi restano certi indipendentemente da eventuali derive del modello.
 */
function normalizeItem(item: MealItem, matchedById: Map<number, CustomFood>): MealItem {
  const grams = num(item.grams);
  const matchedFood =
    item.matched_food_id != null ? matchedById.get(item.matched_food_id) : undefined;

  if (matchedFood && grams > 0) {
    const k = grams / 100;
    return {
      name: matchedFood.name,
      grams: round(grams),
      kcal: round(matchedFood.kcal_per_100 * k),
      protein_g: round(matchedFood.protein_per_100 * k, 1),
      carbs_g: round(matchedFood.carbs_per_100 * k, 1),
      fat_g: round(matchedFood.fat_per_100 * k, 1),
      source: "matched",
      matched_food_id: matchedFood.id,
      confidence: num(item.confidence, 0.5),
    };
  }

  return {
    name: typeof item.name === "string" ? item.name : "sconosciuto",
    grams: round(grams),
    kcal: round(num(item.kcal)),
    protein_g: round(num(item.protein_g), 1),
    carbs_g: round(num(item.carbs_g), 1),
    fat_g: round(num(item.fat_g), 1),
    source: "estimated",
    matched_food_id: null,
    confidence: num(item.confidence, 0.5),
  };
}

/**
 * Analizza un pasto: match dal DB → prompt → Gemini (structured output) → parsing
 * robusto → totali calcolati lato server.
 */
export async function analyzeMeal(input: AnalyzeInput): Promise<AnalyzeResult> {
  const ai = getClient();

  // 1. Match dal database PRIMA di chiamare Gemini.
  const matched = matchFoodsInContext(input.contextText, getAllCustomFoods());
  const matchedById = new Map(matched.map((f) => [f.id, f]));

  // 2. Prompt + immagine inline.
  const prompt = buildMealPrompt(input, matched);

  // 3. Chiamata con structured output nativo (con retry su errori transitori).
  // Prompt + immagine principale + eventuali viste aggiuntive dello stesso pasto.
  const contents = [
    { text: prompt },
    { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
    ...(input.extraImages ?? []).map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.imageBase64 },
    })),
  ];
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: env.gemini.model,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: mealAnalysisSchema,
        temperature: 0.2,
      },
    }),
  );

  // 4. Parsing + normalizzazione.
  const analysis = parseAnalysis(response.text);
  const items = analysis.items.map((it) => normalizeItem(it, matchedById));

  // 5. Totali consistenti calcolati lato server (non ci fidiamo del modello).
  const total = items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein_g: acc.protein_g + it.protein_g,
      carbs_g: acc.carbs_g + it.carbs_g,
      fat_g: acc.fat_g + it.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  return {
    items,
    notes: typeof analysis.notes === "string" ? analysis.notes : undefined,
    total: {
      kcal: round(total.kcal),
      protein_g: round(total.protein_g, 1),
      carbs_g: round(total.carbs_g, 1),
      fat_g: round(total.fat_g, 1),
    },
    model: env.gemini.model,
  };
}
