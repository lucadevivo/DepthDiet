import type { CustomFood } from "../../repositories/customFoods.js";
import type { AnalyzeInput } from "./types.js";

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

  if (input.depth?.volumeMl != null) {
    lines.push(
      "",
      `Indizio volumetrico (da sensore di profondità): ~${Math.round(input.depth.volumeMl)} ml.`,
      "Usalo SOLO come aiuto per stimare le porzioni: volume→massa→macro richiede",
      "assunzioni di densità, quindi trattalo come stima approssimativa, non certa.",
    );
  }

  lines.push(
    "",
    'Per tutti gli alimenti NON presenti nel database, imposta source="estimated".',
  );

  return lines.join("\n");
}
