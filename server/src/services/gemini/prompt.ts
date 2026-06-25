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
export function buildMealPrompt(
  input: AnalyzeInput,
  matched: CustomFood[],
  library: CustomFood[] = [],
): string {
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

  if (input.extraImages && input.extraImages.length > 0) {
    const n = input.extraImages.length + 1;
    lines.push(
      "",
      `Ti vengono fornite ${n} immagini: sono ANGOLAZIONI/VISTE DIVERSE DELLO STESSO pasto,`,
      "non pasti diversi. Usale insieme per riconoscere meglio gli alimenti e stimare le",
      "porzioni, ma NON sommare le quantità tra le foto: conta ogni alimento UNA volta sola.",
    );
  }

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

  // Libreria completa degli Alimenti Personali (esclusi quelli già forzati sopra):
  // serve perché Gemini possa abbinarli quando l'utente li nomina nel prompt
  // (es. "la pasta è la mia preferita") o li riconosce con certezza nel piatto.
  // Così non reinventa i macro di un alimento che l'utente ha già salvato.
  const matchedIds = new Set(matched.map((f) => f.id));
  const others = library.filter((f) => !matchedIds.has(f.id)).slice(0, 80);
  if (others.length > 0) {
    lines.push(
      "",
      "LIBRERIA ALIMENTI PERSONALI dell'utente (per riferimento). Se il contesto/prompt",
      'nomina uno di questi (anche genericamente, es. "la pasta è la mia"), oppure se',
      'riconosci con certezza uno di questi nel piatto, USALO: imposta source="matched",',
      "matched_food_id all'id corrispondente e usa i macro per 100g indicati (NON",
      "reinventarli), stimando solo i grammi. Nel dubbio NON forzare l'abbinamento.",
    );
    for (const f of others) {
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

  // Indizi volumetrici LiDAR: quello della foto principale + quelli delle eventuali
  // viste extra. Sono misure RIPETUTE dello stesso piatto da angolazioni diverse:
  // vanno incrociate per una stima migliore, NON sommate.
  const depths: { label: string; volumeMl: number; quality: DepthQuality }[] = [];
  if (input.depth?.volumeMl != null) {
    depths.push({
      label: "foto principale",
      volumeMl: input.depth.volumeMl,
      quality: input.depth.quality ?? "medium",
    });
  }
  (input.extraImages ?? []).forEach((img, i) => {
    if (img.depth?.volumeMl != null) {
      depths.push({
        label: `vista aggiuntiva ${i + 1}`,
        volumeMl: img.depth.volumeMl,
        quality: img.depth.quality ?? "medium",
      });
    }
  });
  if (depths.length > 0) {
    lines.push(
      "",
      depths.length === 1
        ? "Indizio volumetrico (da sensore di profondità LiDAR):"
        : "Indizi volumetrici (da sensore LiDAR) — MISURE RIPETUTE dello stesso piatto da" +
            " angolazioni diverse, da INCROCIARE per una stima migliore, NON da sommare:",
    );
    for (const d of depths) {
      lines.push(
        `- ${d.label}: ~${Math.round(d.volumeMl)} ml (affidabilità: ${DEPTH_QUALITY_LABEL[d.quality]}).`,
      );
    }
    lines.push(
      "Usali come aiuto per stimare le porzioni: volume→massa→macro richiede assunzioni",
      "di densità, quindi trattali come stime approssimative, non certe.",
    );
    if (depths.every((d) => d.quality === "low")) {
      lines.push("Affidabilità BASSA: pesali poco e dai priorità a ciò che vedi nell'immagine.");
    }
  }

  lines.push(
    "",
    'Per tutti gli alimenti NON presenti nel database, imposta source="estimated".',
  );

  return lines.join("\n");
}
