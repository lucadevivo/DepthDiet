import { View, Text, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";

interface Props {
  values: number[];
  height?: number;
  color?: string;
}

/**
 * Mini-grafico a barre (niente dipendenze SVG): le altezze sono normalizzate
 * sul range min-max così anche piccole variazioni di peso sono visibili.
 */
export function Sparkline({ values, height = 80, color }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const stroke = color ?? colors.calories;
  if (values.length < 2) {
    return <Text style={styles.empty}>Servono almeno 2 misure per il grafico.</Text>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <View>
      <View style={[styles.chart, { height }]}>
        {values.map((v, i) => {
          // 12%..100%: anche il minimo resta visibile.
          const h = 0.12 + 0.88 * ((v - min) / range);
          return <View key={i} style={[styles.bar, { height: `${h * 100}%`, backgroundColor: stroke }]} />;
        })}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{min.toFixed(1)} kg</Text>
        <Text style={styles.axisText}>{max.toFixed(1)} kg</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  bar: { flex: 1, borderRadius: 3, minHeight: 4 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisText: { color: colors.textMuted, fontSize: 11 },
  empty: { color: colors.textMuted, fontSize: 13 },
});
