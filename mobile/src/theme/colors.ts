/**
 * Palette unica dell'app (tema scuro). Centralizzata così i componenti restano
 * coerenti ed è facile introdurre un tema chiaro in seguito.
 */
export const colors = {
  bg: "#0f1115",
  surface: "#171a21",
  surfaceAlt: "#1f232c",
  border: "#262b36",
  text: "#f4f6fb",
  textMuted: "#8b93a7",

  // Accenti macro. Le proteine hanno un accento dedicato e prominente:
  // l'utente fa pesistica e le monitora rigorosamente.
  protein: "#5b8cff",
  carbs: "#f2a93b",
  fat: "#ef6f6c",
  calories: "#3ddc97",
  water: "#39b7e0",
} as const;
