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
import { darkColors, lightColors, type ThemeColors } from "./colors";

export type ThemeMode = "dark" | "light" | "system";
export type Scheme = "dark" | "light";

const STORAGE_KEY = "theme_mode";

interface ThemeContextValue {
  colors: ThemeColors;
  /** Preferenza scelta dall'utente. */
  mode: ThemeMode;
  /** Schema effettivamente applicato (system risolto). */
  scheme: Scheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Carica la preferenza salvata una volta all'avvio.
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((v) => {
        if (v === "dark" || v === "light" || v === "system") setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  };

  const scheme: Scheme = mode === "system" ? (system === "light" ? "light" : "dark") : mode;
  const colors = scheme === "light" ? lightColors : darkColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, mode, scheme, setMode }),
    [colors, mode, scheme],
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
