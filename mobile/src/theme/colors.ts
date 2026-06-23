/**
 * Palette dell'app, ispirata all'app di riferimento "Macros". Esistono due temi
 * (dark/light) con le STESSE chiavi: i componenti leggono i colori dal tema attivo
 * via `useTheme()` (vedi ThemeProvider). L'accento corallo resta in entrambi.
 */
export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryDim: string;
  onPrimary: string;
  protein: string;
  carbs: string;
  fat: string;
  calories: string;
  water: string;
}

export const darkColors: ThemeColors = {
  bg: "#0B0B0D",
  surface: "#161618",
  surfaceAlt: "#1F1F22",
  border: "#27272B",
  text: "#F4F5F7",
  textMuted: "#8A8A91",
  primary: "#EE4A52",
  primaryDim: "#7A2A2E",
  onPrimary: "#FFFFFF",
  protein: "#E84B8A", // magenta
  carbs: "#F5A623", // arancio
  fat: "#4A90E2", // blu
  calories: "#EE4A52",
  water: "#39B7E0",
};

export const lightColors: ThemeColors = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#ECECEF",
  border: "#DEDEE3",
  text: "#16161A",
  textMuted: "#6B6B73",
  primary: "#E23A43",
  primaryDim: "#F4B6B9",
  onPrimary: "#FFFFFF",
  protein: "#C7387A", // magenta più scuro per contrasto su bianco
  carbs: "#C77E10", // arancio più scuro
  fat: "#2F6FD0", // blu più scuro
  calories: "#E23A43",
  water: "#1798C2",
};

/** Fallback statico (tema scuro). I componenti dovrebbero usare `useTheme()`. */
export const colors = darkColors;
