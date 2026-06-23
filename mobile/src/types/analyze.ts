/**
 * Tipi dello Scanner IA (Fase 4a) — mirror di server/src/services/gemini/types.ts.
 * L'endpoint POST /api/analyze riceve un'immagine (+ testo opzionale) e torna gli
 * alimenti riconosciuti con calorie/macro, già abbinati agli Alimenti Personali.
 */

/** Un singolo alimento riconosciuto nel pasto. */
export interface MealItem {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** "matched" = abbinato a un tuo Alimento Personale; "estimated" = stimato da Gemini. */
  source: "estimated" | "matched";
  /** Se source === "matched": id del custom_food abbinato. */
  matched_food_id?: number | null;
  /** Confidenza 0..1 della stima. */
  confidence: number;
}

export interface MealTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Risposta dell'endpoint /api/analyze. */
export interface AnalyzeResult {
  items: MealItem[];
  notes?: string;
  total: MealTotals;
  model: string;
}

/** Qualità della misura volumetrica dal LiDAR (Fase 4b). */
export type DepthQuality = "high" | "medium" | "low";

/** Oggetti di riferimento di dimensioni note usabili come righello (Fase 4b). */
export type ReferenceType = "card_iso" | "coin_1eur" | "coin_2eur";

/** Corpo della richiesta /api/analyze. */
export interface AnalyzeBody {
  imageBase64: string;
  mimeType: string;
  contextText?: string;
  /** Ipotesi volumetrica dal LiDAR (Fase 4b). */
  depth?: { volumeMl?: number; quality?: DepthQuality };
  /** Oggetto di riferimento di scala presente in foto (Fase 4b). */
  reference?: { type: ReferenceType };
}
