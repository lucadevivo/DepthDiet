import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { DEFAULT_LANG, LANGUAGES, isLang, type Lang, type LanguageMeta } from "./languages";
import { STRINGS } from "./strings";

const STORAGE_KEY = "app_lang";

/** Sostituisce i segnaposto {nome} con i valori passati. */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, k) => (k in params ? String(params[k]) : `{${k}}`));
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  languages: LanguageMeta[];
  t: TFunction;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Carica la preferenza salvata una volta all'avvio.
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => {
        if (isLang(v)) setLangState(v);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback<TFunction>(
    (key, params) => {
      const entry = STRINGS[key];
      const text = entry?.[lang] ?? entry?.[DEFAULT_LANG] ?? key;
      return interpolate(text, params);
    },
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, languages: LANGUAGES, t }),
    [lang, setLang, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n deve stare dentro <LanguageProvider>");
  return ctx;
}
