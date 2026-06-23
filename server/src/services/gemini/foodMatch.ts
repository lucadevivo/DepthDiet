import type { CustomFood } from "../../repositories/customFoods.js";

/**
 * Match dal Database (approccio ibrido, vedi Fase 1d/4 del piano):
 * PRIMA di chiamare Gemini cerchiamo nel testo di contesto riferimenti agli
 * Alimenti Personali dell'utente. Per i componenti riconosciuti iniettiamo nel
 * prompt i macro REALI esatti, così Gemini usa numeri certi e stima solo il resto.
 *
 * È volutamente conservativo (meglio pochi falsi positivi): c'è comunque uno step
 * di conferma nella UI dopo l'analisi prima di sostituire qualcosa.
 */

/** Minuscolo, senza accenti, senza punteggiatura, spazi normalizzati. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritici combinanti
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Restituisce gli Alimenti Personali a cui il testo di contesto sembra riferirsi.
 * Un alimento matcha se:
 *   - il suo nome completo normalizzato compare come sottostringa, OPPURE
 *   - tutti i suoi token significativi (len > 2) sono presenti nel contesto.
 */
export function matchFoodsInContext(
  contextText: string | undefined,
  foods: CustomFood[],
): CustomFood[] {
  if (!contextText) return [];
  const ctx = normalize(contextText);
  if (!ctx) return [];
  const ctxTokens = new Set(ctx.split(" "));

  const matched: CustomFood[] = [];
  for (const food of foods) {
    const name = normalize(food.name);
    if (!name) continue;

    if (ctx.includes(name)) {
      matched.push(food);
      continue;
    }
    const tokens = name.split(" ").filter((t) => t.length > 2);
    if (tokens.length > 0 && tokens.every((t) => ctxTokens.has(t))) {
      matched.push(food);
    }
  }
  return matched;
}
