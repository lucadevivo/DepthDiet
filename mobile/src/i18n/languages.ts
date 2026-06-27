/**
 * Lingue supportate dall'app. L'infrastruttura i18n è pensata per crescere: si
 * aggiungono qui i codici e in `strings.ts` le traduzioni delle chiavi.
 *
 * `name` è l'esonimo (nome della lingua nella lingua stessa), mostrato nel
 * selettore. `aiName` è il nome in inglese passato all'IA per farle scegliere la
 * lingua della risposta (scan & suggerimenti).
 */
export type Lang = "en" | "it" | "es" | "fr" | "de" | "pt";

export interface LanguageMeta {
  code: Lang;
  /** Nome nella lingua stessa (per il selettore). */
  name: string;
  /** Nome in inglese, usato nei prompt dell'IA. */
  aiName: string;
  flag: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "en", name: "English", aiName: "English", flag: "🇬🇧" },
  { code: "it", name: "Italiano", aiName: "Italian", flag: "🇮🇹" },
  { code: "es", name: "Español", aiName: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "Français", aiName: "French", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", aiName: "German", flag: "🇩🇪" },
  { code: "pt", name: "Português", aiName: "Portuguese", flag: "🇵🇹" },
];

export const DEFAULT_LANG: Lang = "en";

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && LANGUAGES.some((l) => l.code === v);
}
