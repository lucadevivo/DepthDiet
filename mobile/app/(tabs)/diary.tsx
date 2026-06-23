import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { colors } from "../../src/theme/colors";
import { todayISO } from "../../src/lib/date";
import { useDiaryQuery, useDeleteDiaryEntry } from "../../src/hooks/useDiary";
import { MEAL_LABELS, type MealName } from "../../src/types/nutrition";
import type { DiaryEntry } from "../../src/types/diary";

const MEAL_ORDER: MealName[] = ["breakfast", "lunch", "dinner", "snack"];

export default function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const date = todayISO();
  const diary = useDiaryQuery(date);
  const del = useDeleteDiaryEntry(date);

  const entries = diary.data?.entries ?? [];
  const totals = diary.data?.totals;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.heading}>Diario</Text>
        <View style={styles.links}>
          <Link href="/foods" style={styles.link}>
            Alimenti
          </Link>
          <Link href="/recipes" style={styles.link}>
            Ricette
          </Link>
        </View>
      </View>

      <View style={styles.actions}>
        <Link href="/analyze" asChild>
          <Pressable style={StyleSheet.flatten([styles.scanBtn, styles.actionItem])}>
            <Text style={styles.scanText}>📷 Scansiona pasto</Text>
          </Pressable>
        </Link>
        <Link href="/diary/add" asChild>
          <Pressable style={StyleSheet.flatten([styles.addBtn, styles.actionItem])}>
            <Text style={styles.addText}>+ Aggiungi</Text>
          </Pressable>
        </Link>
      </View>

      {diary.isLoading ? (
        <ActivityIndicator color={colors.protein} style={{ marginTop: 24 }} />
      ) : diary.isError ? (
        <Text style={styles.error}>
          Impossibile caricare il diario. Verifica backend e credenziali.
        </Text>
      ) : (
        <>
          {totals ? (
            <View style={styles.totals}>
              <Text style={styles.totalsKcal}>{totals.kcal} kcal</Text>
              <Text style={styles.totalsMacros}>
                P {totals.protein_g} · C {totals.carbs_g} · G {totals.fat_g} (g)
              </Text>
            </View>
          ) : null}

          {MEAL_ORDER.map((meal) => {
            const items = entries.filter((e) => e.meal === meal);
            return (
              <View key={meal} style={styles.mealBlock}>
                <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
                {items.length === 0 ? (
                  <Text style={styles.empty}>—</Text>
                ) : (
                  items.map((e) => (
                    <EntryRow key={e.id} entry={e} onDelete={() => del.mutate(e.id)} />
                  ))
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function EntryRow({ entry, onDelete }: { entry: DiaryEntry; onDelete: () => void }) {
  return (
    <View style={styles.entry}>
      <View style={{ flex: 1 }}>
        <Text style={styles.entryName}>{entry.description ?? "Voce"}</Text>
        <Text style={styles.entryMeta}>
          {entry.grams != null ? `${entry.grams} g · ` : ""}
          {entry.kcal} kcal · P {entry.protein_g}g
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={styles.del}>
        <Text style={styles.delText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800" },
  links: { flexDirection: "row", gap: 14 },
  link: { color: colors.protein, fontSize: 14, fontWeight: "700" },

  actions: { flexDirection: "row", gap: 10 },
  actionItem: { flex: 1 },
  scanBtn: {
    backgroundColor: colors.protein,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  scanText: { color: "#06210f", fontSize: 15, fontWeight: "800" },
  addBtn: {
    backgroundColor: colors.calories,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  addText: { color: "#06210f", fontSize: 16, fontWeight: "800" },

  totals: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalsKcal: { color: colors.calories, fontSize: 26, fontWeight: "800" },
  totalsMacros: { color: colors.textMuted, fontSize: 14, marginTop: 2 },

  mealBlock: { gap: 8 },
  mealTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  empty: { color: colors.textMuted, fontSize: 13 },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryName: { color: colors.text, fontSize: 15, fontWeight: "600" },
  entryMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  del: { paddingLeft: 12 },
  delText: { color: colors.fat, fontSize: 16, fontWeight: "700" },
  error: { color: colors.fat, fontSize: 14, marginTop: 16 },
});
