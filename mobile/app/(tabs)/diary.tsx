import { useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { colors } from "../../src/theme/colors";
import { todayISO, shiftISO, formatDayLabel } from "../../src/lib/date";
import { useDiaryQuery, useDeleteDiaryEntry } from "../../src/hooks/useDiary";
import { useProfileQuery } from "../../src/hooks/useProfile";
import { MEAL_LABELS, type MealName } from "../../src/types/nutrition";
import { ProgressBar } from "../../src/components/ProgressBar";
import { MacroProgressColumn } from "../../src/components/MacroProgressColumn";
import { MealCard } from "../../src/components/MealCard";

const MEAL_ORDER: MealName[] = ["breakfast", "lunch", "dinner", "snack"];

// Obiettivi di fallback se il profilo non è ancora stato calcolato.
const FALLBACK = { calories: 2600, protein_g: 190, carbs_g: 270, fat_g: 75 };

export default function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [date, setDate] = useState(todayISO());

  const diary = useDiaryQuery(date);
  const del = useDeleteDiaryEntry(date);
  const profile = useProfileQuery();

  const entries = diary.data?.entries ?? [];
  const totals = diary.data?.totals ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const p = profile.data;
  const targets = {
    calories: p?.target_calories ?? FALLBACK.calories,
    protein_g: p?.target_protein_g ?? FALLBACK.protein_g,
    carbs_g: p?.target_carbs_g ?? FALLBACK.carbs_g,
    fat_g: p?.target_fat_g ?? FALLBACK.fat_g,
  };
  const kcalLeft = Math.max(0, Math.round(targets.calories - totals.kcal));

  return (
    <View style={styles.screen}>
      {/* Header dark con selettore giorno */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => setDate(shiftISO(date, -1))} hitSlop={12} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setDate(todayISO())} hitSlop={8}>
          <Text style={styles.dayLabel}>{formatDayLabel(date)}</Text>
        </Pressable>
        <Pressable onPress={() => setDate(shiftISO(date, 1))} hitSlop={12} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {diary.isError ? (
          <Text style={styles.error}>Backend non raggiungibile: configura URL e credenziali.</Text>
        ) : null}

        {/* Card totali giornalieri */}
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
            {kcalLeft > 0 ? `${kcalLeft} kcal rimanenti` : "obiettivo raggiunto ✅"}
          </Text>

          <View style={styles.macroCols}>
            <MacroProgressColumn
              label="Carboidrati"
              current={totals.carbs_g}
              target={targets.carbs_g}
              color={colors.carbs}
            />
            <MacroProgressColumn
              label="Proteine"
              current={totals.protein_g}
              target={targets.protein_g}
              color={colors.protein}
            />
            <MacroProgressColumn
              label="Grassi"
              current={totals.fat_g}
              target={targets.fat_g}
              color={colors.fat}
            />
          </View>
        </View>

        {/* Azione primaria */}
        <Pressable style={styles.scanBtn} onPress={() => router.push("/analyze")}>
          <Text style={styles.scanText}>📷  Scansiona pasto</Text>
        </Pressable>

        {diary.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          MEAL_ORDER.map((meal) => (
            <MealCard
              key={meal}
              title={MEAL_LABELS[meal]}
              entries={entries.filter((e) => e.meal === meal)}
              onAdd={() => router.push(`/diary/add?meal=${meal}`)}
              onDelete={(id) => del.mutate(id)}
            />
          ))
        )}

        {/* Gestione */}
        <View style={styles.links}>
          <Link href="/foods" style={styles.link}>
            🍎 Alimenti
          </Link>
          <Link href="/recipes" style={styles.link}>
            📖 Ricette
          </Link>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

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
  navText: { color: colors.text, fontSize: 30, lineHeight: 32, fontWeight: "400" },
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

  scanBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  scanText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },

  links: { flexDirection: "row", justifyContent: "center", gap: 28, paddingTop: 4 },
  link: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },

  error: { color: colors.primary, fontSize: 13, textAlign: "center" },
});
