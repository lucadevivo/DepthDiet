import { View, Text, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { ProgressBar } from "./ProgressBar";

interface Props {
  label: string;
  current: number;
  target: number;
  color: string;
}

/**
 * Colonna macro compatta in stile "Macros": etichetta colorata in alto,
 * `consumati / target g` e una barra sottile nel colore del macro.
 * Pensata per essere affiancata (3 colonne) nell'header dei totali del Diario.
 */
export function MacroProgressColumn({ label, current, target, color }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  return (
    <View style={styles.col}>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.values}>
        <Text style={styles.current}>{Math.round(current)}</Text>
        <Text style={styles.target}> / {Math.round(target)} g</Text>
      </Text>
      <ProgressBar progress={target ? current / target : 0} color={color} height={5} />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  col: { flex: 1, gap: 6 },
  label: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  values: { textAlign: "center" },
  current: { color: colors.text, fontSize: 14, fontWeight: "700" },
  target: { color: colors.textMuted, fontSize: 12 },
});
