/**
 * Lingua delle risposte dell'IA (scan & suggerimenti). Speculare a
 * mobile/src/i18n/languages.ts: l'app invia il codice, qui lo traduciamo nel nome
 * inglese che mettiamo nel prompt ("Respond in Italian.").
 */
export type AiLang = "en" | "it" | "es" | "fr" | "de" | "pt";

const NAMES: Record<AiLang, string> = {
  en: "English",
  it: "Italian",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
};

const DEFAULT: AiLang = "en";

export function parseLang(v: unknown): AiLang {
  return typeof v === "string" && v in NAMES ? (v as AiLang) : DEFAULT;
}

/** Nome inglese della lingua, da inserire nel prompt. */
export function languageName(lang: AiLang | undefined): string {
  return NAMES[lang ?? DEFAULT];
}

/**
 * L'utente vuole l'abbinamento con i suoi Alimenti salvati? Solo se nel prompt
 * scrive "libreria"/"library" (o l'equivalente nelle altre lingue principali).
 * Senza questa parola lo scanner si limita a stimare, senza toccare la libreria.
 */
const LIBRARY_RE = /\b(library|librer[ií]a|bibliot|bibliothèque)\w*/i;
export function wantsLibraryMatch(text: string | undefined): boolean {
  return typeof text === "string" && LIBRARY_RE.test(text);
}
