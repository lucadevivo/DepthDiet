import { Type, type Schema } from "@google/genai";
import { env } from "../../config/env.js";
import { getClient, withRetry } from "./client.js";
import type { CustomFood } from "../../repositories/customFoods.js";
import type { RecipeSummary } from "../../repositories/recipes.js";
import type { Macros } from "../nutrition.js";

/** Un suggerimento su cosa mangiare per avvicinarsi all'obiettivo del giorno. */
export interface MealSuggestion {
  name: string;
  /** Breve spiegazione del perché è adatto (macro che copre, ecc.). */
  reason: string;
  /** Porzione suggerita in forma leggibile (es. "150 g" o "1 vasetto"). */
  portion: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** true se preso dalla libreria personale (Alimenti/Ricette) dell'utente. */
  from_library: boolean;
}

export interface SuggestResult {
  suggestions: MealSuggestion[];
  notes?: string;
  model: string;
}

export interface SuggestInput {
  /** Macro ancora da coprire per raggiungere l'obiettivo della giornata. */
  remaining: Macros;
  /** Se true, l'IA può proporre SOLO alimenti/ricette già salvati dall'utente. */
  onlyLibrary: boolean;
  /** Richiesta libera dell'utente (un cibo/bevanda voluti, dove si trova, una voglia...). */
  note?: string;
  foods: CustomFood[];
  recipes: RecipeSummary[];
}

const suggestSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          reason: { type: Type.STRING },
          portion: { type: Type.STRING },
          kcal: { type: Type.NUMBER },
          protein_g: { type: Type.NUMBER },
          carbs_g: { type: Type.NUMBER },
          fat_g: { type: Type.NUMBER },
          from_library: { type: Type.BOOLEAN },
        },
        required: [
          "name",
          "reason",
          "portion",
          "kcal",
          "protein_g",
          "carbs_g",
          "fat_g",
          "from_library",
        ],
      },
    },
    notes: { type: Type.STRING },
  },
  required: ["suggestions"],
};

const round = (n: number, d = 0): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};
const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

function buildSuggestPrompt(input: SuggestInput): string {
  const { remaining, onlyLibrary, note, foods, recipes } = input;
  const lines: string[] = [];

  lines.push(
    "You are a helpful nutrition assistant. The user still has the following macros LEFT",
    "to reach today's goal:",
    `- Calories: ${Math.round(remaining.kcal)} kcal`,
    `- Protein: ${round(remaining.protein_g)} g`,
    `- Carbs: ${round(remaining.carbs_g)} g`,
    `- Fat: ${round(remaining.fat_g)} g`,
    "",
    "Suggest 2 to 3 concrete things to eat (real foods, snacks or simple meals) that help",
    "cover the remaining macros without going far over the calories. For each one give a",
    "realistic portion and its macros for that portion.",
    "",
    "IMPORTANT — make the suggestions SENSIBLE and appetizing, like a human nutritionist:",
    "- Suggest things a person would actually eat as a food, snack or meal.",
    "- Use realistic portion sizes.",
    "- NEVER suggest a condiment, sauce, oil, syrup or sugar on its own (e.g. barbecue",
    "  sauce, ketchup, mayo): these are only accompaniments to a real food, never a",
    "  standalone suggestion or eaten in large amounts.",
    "- Prefer balanced, whole foods (e.g. Greek yogurt, chicken, oats, fruit, eggs, rice).",
    "- It is fine to suggest fewer items if that is more sensible.",
    "",
    "Set from_library=true only if the suggestion comes from the user's saved library below.",
    "Respond in English. Keep 'reason' short (one sentence).",
  );

  if (note && note.trim() !== "") {
    lines.push(
      "",
      `The user added this request — honor it as much as possible (it may be a craving, a`,
      `specific food or drink they want, or where they are / what's available): "${note.trim()}"`,
    );
  }

  if (foods.length > 0) {
    lines.push("", "User's saved Foods (macros per 100 g):");
    for (const f of foods.slice(0, 60)) {
      const label = f.brand ? `${f.name} (${f.brand})` : f.name;
      lines.push(
        `- "${label}": ${f.kcal_per_100} kcal, P ${f.protein_per_100} C ${f.carbs_per_100} F ${f.fat_per_100} /100g`,
      );
    }
  }
  if (recipes.length > 0) {
    lines.push("", "User's saved Recipes (totals per recipe):");
    for (const r of recipes.slice(0, 40)) {
      lines.push(
        `- "${r.name}": ${r.totals.kcal} kcal, P ${r.totals.protein_g} C ${r.totals.carbs_g} F ${r.totals.fat_g}`,
      );
    }
  }

  if (onlyLibrary) {
    lines.push(
      "",
      "Suggest ONLY items from the user's saved Foods and Recipes above (adjust the portion",
      "as needed). Do not invent foods that are not in the lists. Every suggestion must have",
      "from_library=true.",
      "BUT keep the suggestions sensible: only propose saved items that work as a real food,",
      "snack or meal in a realistic portion. If the saved items are just condiments/sauces or",
      "are not enough to make a sensible suggestion, return only the few that make sense (or",
      "an empty list) and use 'notes' to explain that the library is too limited and the user",
      "should add more Foods or switch to 'Anything'. Never pad with absurd amounts of sauce.",
    );
    if (foods.length === 0 && recipes.length === 0) {
      lines.push(
        "The library is empty: return an empty suggestions array and explain in 'notes'",
        "that the user should add some Foods or Recipes first.",
      );
    }
  } else {
    lines.push(
      "",
      "You may suggest any common food, not only the saved ones, but prefer the user's",
      "saved items when they fit well.",
    );
  }

  return lines.join("\n");
}

/** Suggerisce cosa mangiare per chiudere i macro mancanti della giornata. */
export async function suggestMeal(input: SuggestInput): Promise<SuggestResult> {
  const ai = getClient();
  const prompt = buildSuggestPrompt(input);

  // Retry con backoff sugli errori transitori (il free tier risponde spesso 429
  // sotto carico/rate-limit, oppure 503 in alta domanda).
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: env.gemini.model,
      contents: [{ text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: suggestSchema,
        temperature: 0.6,
        // Niente "thinking": è solo testo + JSON vincolato, e il thinking di
        // gemini-2.5-flash aggiungeva ~30s di latenza (il client lo viveva come errore).
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  );

  const text = response.text ?? "";
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    raw = match ? JSON.parse(match[0]) : { suggestions: [] };
  }
  const obj = (raw ?? {}) as { suggestions?: unknown[]; notes?: unknown };
  const list = Array.isArray(obj.suggestions) ? obj.suggestions : [];

  const suggestions: MealSuggestion[] = list.map((it) => {
    const s = (it ?? {}) as Record<string, unknown>;
    return {
      name: typeof s.name === "string" ? s.name : "—",
      reason: typeof s.reason === "string" ? s.reason : "",
      portion: typeof s.portion === "string" ? s.portion : "",
      kcal: round(num(s.kcal)),
      protein_g: round(num(s.protein_g), 1),
      carbs_g: round(num(s.carbs_g), 1),
      fat_g: round(num(s.fat_g), 1),
      from_library: s.from_library === true,
    };
  });

  return {
    suggestions,
    notes: typeof obj.notes === "string" ? obj.notes : undefined,
    model: env.gemini.model,
  };
}
