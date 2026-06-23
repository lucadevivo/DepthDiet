import { Type, type Schema } from "@google/genai";

/**
 * Structured output NATIVO di Gemini: passato come `responseSchema` insieme a
 * `responseMimeType: application/json`. Vincola il modello a restituire ESATTAMENTE
 * questa forma, così non ci affidiamo al solo prompt testuale per il JSON.
 */
export const mealAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          grams: { type: Type.NUMBER },
          kcal: { type: Type.NUMBER },
          protein_g: { type: Type.NUMBER },
          carbs_g: { type: Type.NUMBER },
          fat_g: { type: Type.NUMBER },
          source: { type: Type.STRING, enum: ["estimated", "matched"] },
          matched_food_id: { type: Type.INTEGER, nullable: true },
          confidence: { type: Type.NUMBER },
        },
        required: [
          "name",
          "grams",
          "kcal",
          "protein_g",
          "carbs_g",
          "fat_g",
          "source",
          "confidence",
        ],
      },
    },
    notes: { type: Type.STRING },
  },
  required: ["items"],
};
