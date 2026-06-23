import { View, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";

interface Props {
  /** Frazione 0..1 (viene comunque clampata). */
  progress: number;
  color: string;
  height?: number;
}

/** Barra di avanzamento semplice, riusabile (calorie, macro, acqua). */
export function ProgressBar({ progress, color, height = 8 }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  track: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
});
