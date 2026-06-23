/** Un singolo alimento riconosciuto nel pasto. */
export interface MealItem {
  /** Nome leggibile dell'alimento (es. "petto di pollo"). */
  name: string;
  /** Quantità stimata in grammi. */
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** "matched" = abbinato a un Alimento Personale dell'utente; "estimated" = stimato da Gemini. */
  source: "estimated" | "matched";
  /** Se source === "matched": id del custom_food abbinato. */
  matched_food_id?: number | null;
  /** Confidenza 0..1 della stima. */
  confidence: number;
}

/** Risposta grezza richiesta a Gemini (vincolata dal responseSchema). */
export interface MealAnalysis {
  items: MealItem[];
  notes?: string;
}

export interface MealTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Risultato finale restituito dall'endpoint (totali calcolati lato server). */
export interface AnalyzeResult extends MealAnalysis {
  total: MealTotals;
  /** Modello effettivamente usato (per debug/telemetria lato app). */
  model: string;
}

/** Qualità della misura volumetrica dal sensore (Fase 4b). */
export type DepthQuality = "high" | "medium" | "low";

/** Oggetti di riferimento di dimensioni note usabili come righello (Fase 4b). */
export type ReferenceType = "card_iso" | "coin_1eur" | "coin_2eur";

/** Input dell'analisi pasto. */
export interface AnalyzeInput {
  /** Immagine del pasto in base64 (già compressa/ridimensionata dal client). */
  imageBase64: string;
  /** MIME dell'immagine, es. "image/jpeg". */
  mimeType: string;
  /** Contesto testuale opzionale (es. "ci sono 30g di parmigiano sotto"). */
  contextText?: string;
  /** Ipotesi volumetrica opzionale dal LiDAR (Fase 4b). Trattata come stima approssimativa. */
  depth?: { volumeMl?: number; quality?: DepthQuality };
  /** Oggetto di riferimento di scala presente in foto (Fase 4b), aiuta a stimare le porzioni. */
  reference?: { type: ReferenceType };
}
