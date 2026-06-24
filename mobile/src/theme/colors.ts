/**
 * Palette dell'app, ispirata all'app di riferimento "Macros".
 *
 * Il tema ha due dimensioni indipendenti:
 *   1. lo SCHEMA chiaro/scuro (neutri + colori dei macro);
 *   2. l'ACCENTO cromatico (il colore di bottoni, slider, selettori = `primary`),
 *      scelto dall'utente tra `ACCENT_THEMES`.
 *
 * `buildTheme(scheme, accent)` fonde le due dimensioni in un `ThemeColors`.
 * I componenti leggono i colori dal tema attivo via `useTheme()` / `useThemed()`.
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

export type Scheme = "dark" | "light";

/** Neutri + colori dei macro, condivisi da tutti gli accenti (senza `primary`). */
type BaseColors = Omit<ThemeColors, "primary" | "primaryDim" | "onPrimary" | "calories">;

const darkBase: BaseColors = {
  bg: "#0B0B0D",
  surface: "#161618",
  surfaceAlt: "#1F1F22",
  border: "#27272B",
  text: "#F4F5F7",
  textMuted: "#8A8A91",
  protein: "#E84B8A", // magenta
  carbs: "#F5A623", // arancio
  fat: "#4A90E2", // blu
  water: "#39B7E0",
};

const lightBase: BaseColors = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#ECECEF",
  border: "#DEDEE3",
  text: "#16161A",
  textMuted: "#6B6B73",
  protein: "#C7387A", // magenta più scuro per contrasto su bianco
  carbs: "#C77E10", // arancio più scuro
  fat: "#2F6FD0", // blu più scuro
  water: "#1798C2",
};

/** Triple d'accento per uno schema (lo stesso accento ha versione scura e chiara). */
interface AccentTint {
  primary: string;
  primaryDim: string;
  onPrimary: string;
}

export interface AccentTheme {
  id: string;
  label: string;
  dark: AccentTint;
  light: AccentTint;
}

/**
 * Combinazioni cromatiche selezionabili. Ognuna funziona sia in chiaro sia in
 * scuro. Per aggiungerne una basta inserire una voce qui.
 */
export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: "blue",
    label: "Blue",
    dark: { primary: "#3B82F6", primaryDim: "#1E3A6B", onPrimary: "#FFFFFF" },
    light: { primary: "#2563EB", primaryDim: "#BBD0F7", onPrimary: "#FFFFFF" },
  },
  {
    id: "coral",
    label: "Coral",
    dark: { primary: "#EE4A52", primaryDim: "#7A2A2E", onPrimary: "#FFFFFF" },
    light: { primary: "#E23A43", primaryDim: "#F4B6B9", onPrimary: "#FFFFFF" },
  },
  {
    id: "violet",
    label: "Violet",
    dark: { primary: "#8B5CF6", primaryDim: "#3E2C72", onPrimary: "#FFFFFF" },
    light: { primary: "#7C3AED", primaryDim: "#D6C6F8", onPrimary: "#FFFFFF" },
  },
  {
    id: "green",
    label: "Green",
    dark: { primary: "#22C55E", primaryDim: "#14502B", onPrimary: "#06210F" },
    light: { primary: "#16A34A", primaryDim: "#B6E6C8", onPrimary: "#FFFFFF" },
  },
  {
    id: "teal",
    label: "Teal",
    dark: { primary: "#14B8A6", primaryDim: "#0C4F49", onPrimary: "#03201D" },
    light: { primary: "#0D9488", primaryDim: "#A8E4DD", onPrimary: "#FFFFFF" },
  },
  {
    id: "amber",
    label: "Amber",
    dark: { primary: "#F59E0B", primaryDim: "#6E480A", onPrimary: "#241500" },
    light: { primary: "#D97706", primaryDim: "#F6D9A8", onPrimary: "#FFFFFF" },
  },
];

export const DEFAULT_ACCENT_ID = "blue";

export function getAccent(id: string): AccentTheme {
  return ACCENT_THEMES.find((a) => a.id === id) ?? ACCENT_THEMES[0]!;
}

/** Fonde schema (neutri/macro) e accento in un tema completo. */
export function buildTheme(scheme: Scheme, accent: AccentTheme): ThemeColors {
  const base = scheme === "light" ? lightBase : darkBase;
  const tint = scheme === "light" ? accent.light : accent.dark;
  return {
    ...base,
    primary: tint.primary,
    primaryDim: tint.primaryDim,
    onPrimary: tint.onPrimary,
    calories: tint.primary, // l'anello calorie segue l'accento
  };
}

/** Fallback statico (scuro, accento di default). I componenti usano `useTheme()`. */
export const colors = buildTheme("dark", getAccent(DEFAULT_ACCENT_ID));

// ---------------------------------------------------------------------------
// Colori personalizzabili: sfondo dell'app e colore dei box (surface). L'utente
// può sceglierli da un piccolo catalogo, separati per schema chiaro/scuro così
// il testo (dal tema) resta sempre leggibile.
// ---------------------------------------------------------------------------

export interface ColorOption {
  id: string;
  label: string;
  value: string;
}

/** Tinte di SFONDO per schema. La prima ("default") = nessun override. */
export const BG_PRESETS: Record<Scheme, ColorOption[]> = {
  dark: [
    { id: "default", label: "Default", value: "#0B0B0D" },
    { id: "charcoal", label: "Charcoal", value: "#121218" },
    { id: "navy", label: "Navy", value: "#0B1422" },
    { id: "forest", label: "Forest", value: "#0A1A14" },
    { id: "plum", label: "Plum", value: "#160E1E" },
    { id: "black", label: "Black", value: "#000000" },
  ],
  light: [
    { id: "default", label: "Default", value: "#F4F5F7" },
    { id: "white", label: "White", value: "#FFFFFF" },
    { id: "sky", label: "Sky", value: "#EEF3F9" },
    { id: "lilac", label: "Lilac", value: "#F2EFFA" },
    { id: "sand", label: "Sand", value: "#FAF4EC" },
    { id: "mint", label: "Mint", value: "#EBF4EF" },
  ],
};

/** Tinte dei BOX (surface) per schema. La prima ("default") = nessun override. */
export const SURFACE_PRESETS: Record<Scheme, ColorOption[]> = {
  dark: [
    { id: "default", label: "Default", value: "#161618" },
    { id: "graphite", label: "Graphite", value: "#1E1E24" },
    { id: "ink", label: "Ink", value: "#15202E" },
    { id: "moss", label: "Moss", value: "#152219" },
    { id: "grape", label: "Grape", value: "#221530" },
    { id: "jet", label: "Jet", value: "#0E0E10" },
  ],
  light: [
    { id: "default", label: "Default", value: "#FFFFFF" },
    { id: "paper", label: "Paper", value: "#F7F8FA" },
    { id: "ice", label: "Ice", value: "#F0F5FB" },
    { id: "blush", label: "Blush", value: "#FBF1F5" },
    { id: "cream", label: "Cream", value: "#FCF7EF" },
    { id: "sage", label: "Sage", value: "#F0F6F1" },
  ],
};

/** Mescola due colori hex (#rrggbb) con peso t (0 = a, 1 = b). */
function mix(a: string, b: string, t: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((x, i) => Math.round(x + (pb[i]! - x) * t));
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Applica gli override di colore scelti dall'utente su un tema già costruito:
 * `bg` e `surface` diventano i colori scelti; `surfaceAlt` e `border` vengono
 * derivati dal surface (verso il testo) per mantenere contrasto e gerarchia.
 */
export function withCustomColors(
  base: ThemeColors,
  bg: string | null,
  surface: string | null,
): ThemeColors {
  const next = { ...base };
  if (bg) next.bg = bg;
  if (surface) {
    next.surface = surface;
    next.surfaceAlt = mix(surface, base.text, 0.08);
    next.border = mix(surface, base.text, 0.16);
  }
  return next;
}
