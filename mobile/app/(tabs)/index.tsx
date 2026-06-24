import { useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { todayISO, shiftISO, formatDayLabel } from "../../src/lib/date";
import { useDiaryQuery, useDeleteDiaryEntry } from "../../src/hooks/useDiary";
import type { DiaryEntry } from "../../src/types/diary";
import { useProfileQuery } from "../../src/hooks/useProfile";
import { useMealsQuery } from "../../src/hooks/useMeals";
import { ProgressBar } from "../../src/components/ProgressBar";
import { MacroProgressColumn } from "../../src/components/MacroProgressColumn";
import { MealCard } from "../../src/components/MealCard";
import { WaterCounter } from "../../src/components/WaterCounter";
import { Icon } from "../../src/components/Icon";
import { bodyMetricsFromProfile } from "../../src/lib/bodyMetrics";

// Fallback targets if the profile hasn't been computed yet.
const FALLBACK = { calories: 2600, protein_g: 190, carbs_g: 270, fat_g: 75 };

export default function DiaryScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [date, setDate] = useState(todayISO());

  const diary = useDiaryQuery(date);
  const del = useDeleteDiaryEntry(date);
  const profile = useProfileQuery();
  const meals = useMealsQuery();

  const entries = diary.data?.entries ?? [];
  const mealList = meals.data ?? [];
  // Voci il cui pasto non esiste più (meal_id null o pasto eliminato) → "Other".
  const mealIds = new Set(mealList.map((m) => m.id));
  const orphanEntries = entries.filter((e) => e.meal_id == null || !mealIds.has(e.meal_id));
  const totals = diary.data?.totals ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const p = profile.data;
  const targets = {
    calories: p?.target_calories ?? FALLBACK.calories,
    protein_g: p?.target_protein_g ?? FALLBACK.protein_g,
    carbs_g: p?.target_carbs_g ?? FALLBACK.carbs_g,
    fat_g: p?.target_fat_g ?? FALLBACK.fat_g,
  };
  const kcalLeft = Math.max(0, Math.round(targets.calories - totals.kcal));

  // Apre la modifica della grammatura di una voce: i dati correnti viaggiano nei
  // parametri così la schermata può mostrare l'anteprima senza un nuovo fetch.
  const openEdit = (e: DiaryEntry) => {
    const q =
      `id=${e.id}&date=${date}&grams=${e.grams ?? ""}` +
      `&kcal=${e.kcal}&protein_g=${e.protein_g}&carbs_g=${e.carbs_g}&fat_g=${e.fat_g}` +
      `&food_id=${e.custom_food_id ?? ""}` +
      `&name=${encodeURIComponent(e.description ?? "Entry")}`;
    router.push(`/diary/edit-entry?${q}`);
  };

  return (
    <View style={styles.screen}>
      {/* Titolo schermata in alto a sinistra, come le altre schede. */}
      <View style={[styles.titleBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.heading}>Diary</Text>
      </View>

      {/* Selettore del giorno */}
      <View style={styles.header}>
        <Pressable onPress={() => setDate(shiftISO(date, -1))} hitSlop={12} style={styles.navBtn}>
          <Icon name="back" size={26} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={() => setDate(todayISO())} hitSlop={8}>
          <Text style={styles.dayLabel}>{formatDayLabel(date)}</Text>
        </Pressable>
        <Pressable onPress={() => setDate(shiftISO(date, 1))} hitSlop={12} style={styles.navBtn}>
          <Icon name="forward" size={26} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {diary.isError ? (
          <Text style={styles.error}>Backend unreachable: check URL and credentials.</Text>
        ) : null}

        {/* Daily totals card */}
        <View style={styles.totals}>
          <View style={styles.kcalRow}>
            <Text style={styles.kcalConsumed}>{Math.round(totals.kcal)}</Text>
            <Text style={styles.kcalTarget}> / {Math.round(targets.calories)} kcal</Text>
          </View>
          <ProgressBar
            progress={targets.calories ? totals.kcal / targets.calories : 0}
            color={colors.primary}
            height={10}
          />
          <Text style={styles.kcalLeft}>
            {kcalLeft > 0 ? `${kcalLeft} kcal left` : "goal reached"}
          </Text>

          <View style={styles.macroCols}>
            <MacroProgressColumn
              label="Carbs"
              current={totals.carbs_g}
              target={targets.carbs_g}
              color={colors.carbs}
            />
            <MacroProgressColumn
              label="Protein"
              current={totals.protein_g}
              target={targets.protein_g}
              color={colors.protein}
            />
            <MacroProgressColumn
              label="Fat"
              current={totals.fat_g}
              target={targets.fat_g}
              color={colors.fat}
            />
          </View>
        </View>

        {diary.isLoading || meals.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <>
            {mealList.map((meal) => (
              <MealCard
                key={meal.id}
                title={meal.name}
                entries={entries.filter((e) => e.meal_id === meal.id)}
                onAdd={() => router.push(`/diary/add?meal_id=${meal.id}&date=${date}`)}
                onDelete={(id) => del.mutate(id)}
                onEditEntry={openEdit}
              />
            ))}
            {orphanEntries.length > 0 ? (
              <MealCard
                title="Other"
                entries={orphanEntries}
                onAdd={() => {}}
                onDelete={(id) => del.mutate(id)}
                showAdd={false}
              />
            ) : null}

            {/* Box acqua: in fondo a tutti i pasti, progresso verso l'obiettivo e oltre. */}
            <WaterCounter
              date={date}
              targetMl={bodyMetricsFromProfile(p)?.waterMl ?? 2500}
            />

            {/* Suggeritore IA: cosa mangiare per chiudere i macro mancanti del giorno. */}
            <Pressable
              style={styles.suggestBtn}
              onPress={() => router.push(`/diary/suggest?date=${date}`)}
            >
              <Icon name="bulb" size={20} color={colors.onPrimary} />
              <Text style={styles.suggestText}>What should I eat?</Text>
            </Pressable>
            <Text style={styles.suggestHint}>
              Get an AI suggestion to reach today's goal.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  titleBar: { paddingHorizontal: 16, paddingBottom: 4, backgroundColor: colors.bg },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  navBtn: { width: 32, alignItems: "center" },
  dayLabel: { color: colors.text, fontSize: 20, fontWeight: "800", minWidth: 120, textAlign: "center" },

  content: { padding: 16, gap: 14 },

  totals: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kcalRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center" },
  kcalConsumed: { color: colors.text, fontSize: 32, fontWeight: "800" },
  kcalTarget: { color: colors.textMuted, fontSize: 16, fontWeight: "600" },
  kcalLeft: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  macroCols: { flexDirection: "row", gap: 12, marginTop: 6 },

  error: { color: colors.primary, fontSize: 13, textAlign: "center" },

  suggestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
  },
  suggestText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
  suggestHint: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: -6 },
});
