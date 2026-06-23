/**
 * Palette unica dell'app (tema scuro), ispirata all'app di riferimento "Macros":
 * sfondo near-black, card grigio scuro, accento rosso corallo. Centralizzata così
 * i componenti restano coerenti.
 */
export const colors = {
  // Superfici (dal più scuro al più chiaro)
  bg: "#0B0B0D",
  surface: "#161618",
  surfaceAlt: "#1F1F22",
  border: "#27272B",

  // Testo
  text: "#F4F5F7",
  textMuted: "#8A8A91",

  // Accento primario (azioni, tab attiva, totale calorie, "Aggiungi")
  primary: "#EE4A52",
  primaryDim: "#7A2A2E", // versione spenta per tracce/sfondi tenui
  onPrimary: "#FFFFFF",

  // Accenti macro (allineati al riferimento: proteine prominenti per l'utente)
  protein: "#E84B8A", // magenta
  carbs: "#F5A623", // arancio
  fat: "#4A90E2", // blu
  calories: "#EE4A52", // = primary, headline metric
  water: "#39B7E0", // ciano
} as const;
