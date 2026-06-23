import { FlatList, View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/theme/colors";
import { ProgressBar } from "../../src/components/ProgressBar";
import { mockHistory } from "../../src/mock/nutrition";
import { MEAL_LABELS, type DaySummary } from "../../src/types/nutrition";

/** Formatta 'YYYY-MM-DD' in una data leggibile in italiano. */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
}

function DayCard({ day }: { day: DaySummary }) {
  const eaten = day.meals.filter((m) => m.calories > 0);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(day.date)}</Text>
        <Text style={styles.kcal}>
          {Math.round(day.totals.calories)}{" "}
          <Text style={styles.kcalTarget}>/ {day.targets.calories} kcal</Text>
        </Text>
      </View>
      <ProgressBar progress={day.totals.calories / day.targets.calories} color={colors.calories} />
      <View style={styles.macros}>
        <Text style={styles.macro}>P {Math.round(day.totals.protein_g)}g</Text>
        <Text style={styles.macro}>C {Math.round(day.totals.carbs_g)}g</Text>
        <Text style={styles.macro}>G {Math.round(day.totals.fat_g)}g</Text>
      </View>
      <View style={styles.meals}>
        {eaten.map((m) => (
          <Text key={m.meal} style={styles.meal}>
            {MEAL_LABELS[m.meal]}: {m.calories} kcal
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Storico Giornaliero (Fase 2, dati mock): lista dei giorni precedenti. */
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      data={mockHistory}
      keyExtractor={(d) => d.date}
      ListHeaderComponent={<Text style={styles.heading}>Storico</Text>}
      renderItem={({ item }) => <DayCard day={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { color: colors.text, fontSize: 15, fontWeight: "700", textTransform: "capitalize" },
  kcal: { color: colors.text, fontSize: 14, fontWeight: "700" },
  kcalTarget: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
  macros: { flexDirection: "row", gap: 14 },
  macro: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  meals: { gap: 2 },
  meal: { color: colors.textMuted, fontSize: 12 },
});
