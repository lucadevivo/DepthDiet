import type { CustomFood } from "../../repositories/customFoods.js";
import type { AnalyzeInput, DepthQuality, ReferenceType } from "./types.js";

/** Descrizione (con dimensioni reali) degli oggetti di riferimento, per il prompt. */
const REFERENCE_LABEL: Record<ReferenceType, string> = {
  card_iso: "una carta formato bancomat/credito (ISO ID-1, 85.6 × 54 mm)",
  coin_1eur: "una moneta da 1 euro (diametro 23.25 mm)",
  coin_2eur: "una moneta da 2 euro (diametro 25.75 mm)",
};

const DEPTH_QUALITY_LABEL: Record<DepthQuality, string> = {
  high: "alta",
  medium: "media",
  low: "bassa",
};

/**
 * Costruisce il prompt testuale che accompagna l'immagine. Lo schema JSON è già
 * imposto via responseSchema; qui diamo a Gemini il CONTESTO e le regole:
 *  - usare i macro REALI degli alimenti già abbinati dal DB (non indovinarli);
 *  - stimare solo il resto e le quantità;
 *  - sfruttare l'eventuale ipotesi volumetrica (LiDAR) come indizio, non come certezza.
 */
export function buildMealPrompt(input: AnalyzeInput, matched: CustomFood[]): string {
  const lines: string[] = [];

  lines.push(
    "Sei un nutrizionista. Analizza la foto del pasto e stima gli alimenti presenti,",
    "le quantità in grammi e i macronutrienti. Rispondi in italiano.",
    "",
    "Regole:",
    "- Scomponi il pasto nei singoli alimenti riconoscibili.",
    "- Per ogni alimento stima grammi, kcal, proteine, carboidrati e grassi.",
    "- 'confidence' è la tua sicurezza 0..1 sulla stima di quell'alimento.",
  );

  if (input.contextText && input.contextText.trim() !== "") {
    lines.push("", `Contesto fornito dall'utente: "${input.contextText.trim()}"`);
  }

  if (matched.length > 0) {
    lines.push(
      "",
      "Alimenti GIÀ IDENTIFICATI dal database personale dell'utente: per QUESTI usa i",
      "macro per 100g indicati qui sotto (NON reinventarli); stima solo i grammi,",
      'imposta source="matched" e matched_food_id all\'id corrispondente.',
    );
    for (const f of matched) {
      const label = f.brand ? `${f.name} (${f.brand})` : f.name;
      lines.push(
        `- id=${f.id} "${label}": ${f.kcal_per_100} kcal, ` +
          `P ${f.protein_per_100}g, C ${f.carbs_per_100}g, G ${f.fat_per_100}g per 100g`,
      );
    }
  }

  if (input.reference?.type != null) {
    // Riferimento esplicito (compatibilità con vecchie richieste): l'utente ha
    // dichiarato l'oggetto presente in foto.
    lines.push(
      "",
      `In foto è presente un OGGETTO DI RIFERIMENTO di dimensioni note: ${REFERENCE_LABEL[input.reference.type]}.`,
      "Usalo come righello: misura le dimensioni del cibo rispetto al riferimento per",
      "stimare le porzioni reali (e quindi i grammi) con più precisione.",
      "Non conteggiare l'oggetto di riferimento tra gli alimenti.",
    );
  } else {
    // Auto-rilevamento: nessun oggetto dichiarato. Se ne trovi uno di dimensioni
    // note, usalo da solo come scala — senza che l'utente debba indicarlo.
    lines.push(
      "",
      "RILEVAMENTO SCALA (automatico): cerca nella foto un oggetto di dimensioni note",
      "utilizzabile come righello e, se presente, usalo per stimare la scala reale del",
      "cibo e quindi i grammi con più precisione. Dimensioni di riferimento note:",
      "- moneta da 1 euro: diametro 23.25 mm; moneta da 2 euro: diametro 25.75 mm;",
      "- carta bancomat/credito (ISO ID-1): 85.6 × 54 mm;",
      "- forchetta/cucchiaio da tavola standard: lunghezza ~19-20 cm;",
      "- piatto piano standard: diametro ~26-27 cm; sottopiatto/piattino: ~15-19 cm.",
      "Scegli il riferimento più affidabile presente e non conteggiarlo tra gli alimenti.",
      "Se non c'è alcun riferimento utile, stima le porzioni dall'aspetto del cibo.",
    );
  }

  if (input.depth?.volumeMl != null) {
    const q = input.depth.quality ?? "medium";
    lines.push(
      "",
      `Indizio volumetrico (da sensore di profondità LiDAR): ~${Math.round(input.depth.volumeMl)} ml` +
        ` (affidabilità della misura: ${DEPTH_QUALITY_LABEL[q]}).`,
      "Usalo come aiuto per stimare le porzioni: volume→massa→macro richiede assunzioni",
      "di densità, quindi trattalo come stima approssimativa, non certa.",
    );
    if (q === "low") {
      lines.push("Affidabilità BASSA: pesalo poco e dai priorità a ciò che vedi nell'immagine.");
    }
  }

  lines.push(
    "",
    'Per tutti gli alimenti NON presenti nel database, imposta source="estimated".',
  );

  return lines.join("\n");
}
