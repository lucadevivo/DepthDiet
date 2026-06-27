import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ColorValue } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

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
  remove: "remove",
  menu: "ellipsis-vertical",
  drag: "reorder-three-outline",

  // Azioni / sezioni
  scan: "scan-outline",
  search: "search-outline",
  camera: "camera-outline",
  flash: "flash",
  flashOff: "flash-off",
  gallery: "images-outline",
  food: "nutrition-outline",
  recipe: "restaurant-outline",
  meals: "fast-food-outline",
  barcode: "barcode-outline",
  bulb: "bulb-outline",
  ruler: "resize-outline",
  info: "information-circle-outline",
  language: "language-outline",
  palette: "color-palette-outline",

  // Metriche
  calories: "flame",
  bmi: "body-outline",
  bodyfat: "fitness-outline",
  water: "water",
  creatine: "medical-outline",
  weight: "barbell-outline",
  activity: "walk-outline",
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
  const tint = color ?? colors.text;
  // "food": mela pulita di MaterialCommunityIcons (senza i semini/"occhietti"
  // dell'icona nutrition di Ionicons).
  if (name === "food") {
    return <MaterialCommunityIcons name="food-apple-outline" size={size} color={tint} />;
  }
  return <Ionicons name={MAP[name]} size={size} color={tint} />;
}
