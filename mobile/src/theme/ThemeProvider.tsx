import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  ACCENT_THEMES,
  BG_PRESETS,
  DEFAULT_ACCENT_ID,
  SURFACE_PRESETS,
  buildTheme,
  getAccent,
  withCustomColors,
  type AccentTheme,
  type ColorOption,
  type Scheme,
  type ThemeColors,
} from "./colors";

export type ThemeMode = "dark" | "light" | "system";
export type { Scheme };

const STORAGE_KEY = "theme_mode";
const ACCENT_KEY = "theme_accent";
const BG_COLOR_KEY = "theme_bg_color";
const SURFACE_COLOR_KEY = "theme_surface_color";

interface ThemeContextValue {
  colors: ThemeColors;
  /** Preferenza chiaro/scuro scelta dall'utente. */
  mode: ThemeMode;
  /** Schema effettivamente applicato (system risolto). */
  scheme: Scheme;
  setMode: (mode: ThemeMode) => void;
  /** Combinazione cromatica (accento) attiva e setter. */
  accentId: string;
  setAccentId: (id: string) => void;
  accents: AccentTheme[];
  /** Colore di sfondo scelto ("default" = tema). */
  bgColorId: string;
  setBgColorId: (id: string) => void;
  bgPresets: ColorOption[];
  /** Colore dei box (surface) scelto ("default" = tema). */
  surfaceColorId: string;
  setSurfaceColorId: (id: string) => void;
  surfacePresets: ColorOption[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [accentId, setAccentIdState] = useState<string>(DEFAULT_ACCENT_ID);
  const [bgColorId, setBgColorIdState] = useState<string>("default");
  const [surfaceColorId, setSurfaceColorIdState] = useState<string>("default");

  // Carica le preferenze salvate una volta all'avvio.
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => {
        if (v === "dark" || v === "light" || v === "system") setModeState(v);
      })
      .catch(() => {});
    SecureStore.getItemAsync(ACCENT_KEY)
      .then((v) => {
        if (v && ACCENT_THEMES.some((a) => a.id === v)) setAccentIdState(v);
      })
      .catch(() => {});
    SecureStore.getItemAsync(BG_COLOR_KEY)
      .then((v) => {
        if (v) setBgColorIdState(v);
      })
      .catch(() => {});
    SecureStore.getItemAsync(SURFACE_COLOR_KEY)
      .then((v) => {
        if (v) setSurfaceColorIdState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  };

  const setAccentId = (next: string) => {
    setAccentIdState(next);
    SecureStore.setItemAsync(ACCENT_KEY, next).catch(() => {});
  };

  const setBgColorId = (next: string) => {
    setBgColorIdState(next);
    SecureStore.setItemAsync(BG_COLOR_KEY, next).catch(() => {});
  };

  const setSurfaceColorId = (next: string) => {
    setSurfaceColorIdState(next);
    SecureStore.setItemAsync(SURFACE_COLOR_KEY, next).catch(() => {});
  };

  const scheme: Scheme = mode === "system" ? (system === "light" ? "light" : "dark") : mode;
  const accent = getAccent(accentId);
  const bgPresets = BG_PRESETS[scheme];
  const surfacePresets = SURFACE_PRESETS[scheme];

  // Risolve gli ID colore (nello schema corrente). "default" = nessun override.
  const bgValue = bgColorId !== "default" ? (bgPresets.find((o) => o.id === bgColorId)?.value ?? null) : null;
  const surfaceValue =
    surfaceColorId !== "default" ? (surfacePresets.find((o) => o.id === surfaceColorId)?.value ?? null) : null;

  const colors = withCustomColors(buildTheme(scheme, accent), bgValue, surfaceValue);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      mode,
      scheme,
      setMode,
      accentId,
      setAccentId,
      accents: ACCENT_THEMES,
      bgColorId,
      setBgColorId,
      bgPresets,
      surfaceColorId,
      setSurfaceColorId,
      surfacePresets,
    }),
    [colors, mode, scheme, accentId, bgColorId, surfaceColorId, bgPresets, surfacePresets],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve stare dentro <ThemeProvider>");
  return ctx;
}

/**
 * Helper per gli StyleSheet a colori dinamici: passa una factory che riceve i
 * colori del tema attivo e restituisce gli stili (memoizzati per tema).
 *
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (colors: ThemeColors) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}

/**
 * Variante che restituisce in un colpo solo i colori del tema e gli stili
 * derivati (così un componente fa una sola riga):
 *
 *   const { colors, styles } = useThemed(makeStyles);
 */
export function useThemed<T>(factory: (colors: ThemeColors) => T): {
  colors: ThemeColors;
  styles: T;
} {
  const { colors } = useTheme();
  const styles = useMemo(() => factory(colors), [colors, factory]);
  return { colors, styles };
}
