import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface Props {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const KCAL = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * Distribuzione dei macronutrienti come barra a segmenti proporzionale (per
 * quota calorica) + legenda con grammi e percentuale. Sostituto affidabile della
 * "ciambella" del riferimento, senza dipendenze grafiche native.
 */
export function MacroSplitBar({ protein_g, carbs_g, fat_g }: Props) {
  const kc = {
    carbs: carbs_g * KCAL.carbs,
    protein: protein_g * KCAL.protein,
    fat: fat_g * KCAL.fat,
  };
  const tot = kc.carbs + kc.protein + kc.fat;
  const pct = (v: number) => (tot > 0 ? Math.round((v / tot) * 100) : 0);

  const segments = [
    { key: "carbs", g: carbs_g, kc: kc.carbs, color: colors.carbs, label: "Carbs" },
    { key: "protein", g: protein_g, kc: kc.protein, color: colors.protein, label: "Protein" },
    { key: "fat", g: fat_g, kc: kc.fat, color: colors.fat, label: "Fat" },
  ];

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.bar}>
        {tot > 0 ? (
          segments.map((s) =>
            s.kc > 0 ? (
              <View key={s.key} style={{ flex: s.kc, backgroundColor: s.color }} />
            ) : null,
          )
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.surfaceAlt }} />
        )}
      </View>

      <View style={styles.legend}>
        {segments.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <View>
              <Text style={styles.legendLabel}>{s.label}</Text>
              <Text style={styles.legendValue}>
                {Math.round(s.g)} g · {pct(s.kc)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  legend: { flexDirection: "row", justifyContent: "space-between" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  legendValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
});
