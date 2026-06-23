import Ionicons from "@expo/vector-icons/Ionicons";
import type { ColorValue } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";

/**
 * Set di icone dell'app, mappate su Ionicons (font-based: nessun modulo nativo
 * extra, funziona su Metro senza ricompilare). Nomi semantici così il resto
 * dell'app non dipende dai nomi della libreria e lo stile è centralizzato.
 */
const MAP = {
  // Tab / navigazione
  today: "today-outline",
  diary: "book-outline",
  history: "time-outline",
  goals: "pie-chart-outline",
  profile: "person-circle-outline",
  settings: "settings-outline",
  back: "chevron-back",
  forward: "chevron-forward",
  chevron: "chevron-forward",
  close: "close",
  add: "add",
  menu: "ellipsis-vertical",

  // Azioni / sezioni
  scan: "scan-outline",
  camera: "camera-outline",
  gallery: "images-outline",
  food: "nutrition-outline",
  recipe: "restaurant-outline",
  meals: "fast-food-outline",
  barcode: "barcode-outline",
  bulb: "bulb-outline",
  ruler: "resize-outline",

  // Metriche
  calories: "flame",
  bmi: "body-outline",
  bodyfat: "fitness-outline",
  water: "water",
  weight: "barbell-outline",
  goal: "flag-outline",
  check: "checkmark",
} as const;

export type IconName = keyof typeof MAP;

interface Props {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

export function Icon({ name, size = 22, color }: Props) {
  const { colors } = useTheme();
  return <Ionicons name={MAP[name]} size={size} color={color ?? colors.text} />;
}
