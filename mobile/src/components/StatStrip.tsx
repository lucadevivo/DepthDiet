import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export interface Stat {
  label: string;
  value: string;
}

/** Striscia a 4 colonne con i dati anagrafici (stile "Macros"). Sola lettura. */
export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <View style={styles.strip}>
      {stats.map((s, i) => (
        <View key={s.label} style={[styles.col, i > 0 && styles.divider]}>
          <Text style={styles.value} numberOfLines={1}>
            {s.value}
          </Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  col: { flex: 1, alignItems: "center", gap: 4 },
  divider: { borderLeftWidth: 1, borderLeftColor: colors.border },
  value: { color: colors.text, fontSize: 18, fontWeight: "800" },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
