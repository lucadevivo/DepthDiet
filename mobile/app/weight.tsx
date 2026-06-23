import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { Sparkline } from "../src/components/Sparkline";
import { useTheme, useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { todayISO } from "../src/lib/date";
import {
  useAdaptiveQuery,
  useApplyAdaptive,
  useDeleteWeight,
  useLogWeight,
  useWeightsQuery,
} from "../src/hooks/useWeight";

export default function WeightScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const weights = useWeightsQuery();
  const adaptive = useAdaptiveQuery();
  const logWeight = useLogWeight();
  const deleteWeight = useDeleteWeight();
  const applyAdaptive = useApplyAdaptive();

  const [w, setW] = useState("");
  const value = Number.parseFloat(w);
  const valid = Number.isFinite(value) && value >= 20 && value <= 400;

  const onLog = () => {
    if (!valid) return;
    logWeight.mutate({ date: todayISO(), weight_kg: value }, { onSuccess: () => setW("") });
  };

  const data = weights.data ?? [];
  const recent = [...data].reverse(); // più recenti in cima

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Weight" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Registrazione */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log today's weight</Text>
          <View style={styles.logRow}>
            <NumberField label="Weight" value={w} onChangeText={setW} unit="kg" />
            <Pressable
              onPress={onLog}
              disabled={!valid || logWeight.isPending}
              style={[styles.btn, (!valid || logWeight.isPending) && styles.disabled]}
            >
              {logWeight.isPending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.btnText}>Log</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Adaptive TDEE */}
        <AdaptiveCard
          loading={adaptive.isLoading}
          error={adaptive.isError}
          data={adaptive.data}
          onApply={() => applyAdaptive.mutate()}
          applying={applyAdaptive.isPending}
          applied={applyAdaptive.isSuccess ? applyAdaptive.data.applied : null}
        />

        {/* Trend */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trend</Text>
          {weights.isLoading ? (
            <ActivityIndicator color={colors.protein} />
          ) : (
            <Sparkline values={data.map((d) => d.weight_kg)} color={colors.water} />
          )}
        </View>

        {/* Storico misure */}
        <Text style={styles.listTitle}>Measurements</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>No measurements yet.</Text>
        ) : (
          recent.map((entry) => (
            <View key={entry.id} style={styles.row}>
              <Text style={styles.date}>{entry.entry_date}</Text>
              <Text style={styles.kg}>{entry.weight_kg.toFixed(1)} kg</Text>
              <Pressable onPress={() => deleteWeight.mutate(entry.id)} hitSlop={10}>
                <Text style={styles.del}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function AdaptiveCard({
  loading,
  error,
  data,
  onApply,
  applying,
  applied,
}: {
  loading: boolean;
  error: boolean;
  data: import("../src/types/weight").AdaptiveSuggestion | undefined;
  onApply: () => void;
  applying: boolean;
  applied: number | null;
}) {
  const { colors, styles } = useThemed(makeStyles);
  return (
    <View style={[styles.card, styles.adaptiveCard]}>
      <Text style={styles.cardTitle}>Adaptive TDEE</Text>
      {loading ? (
        <ActivityIndicator color={colors.protein} />
      ) : error ? (
        <Text style={styles.errorText}>Imposta gli obiettivi nel Calcolatore per il Adaptive TDEE.</Text>
      ) : data ? (
        <>
          <View style={styles.trendRow}>
            <Trend label="Actual trend" value={data.trendKgPerWeek != null ? `${data.trendKgPerWeek} kg/week` : "—"} />
            <Trend label="Expected" value={`${data.expectedKgPerWeek} kg/week`} />
          </View>
          <Text style={styles.reason}>{data.reason}</Text>
          {data.hasEnoughData && data.adjustmentKcal !== 0 ? (
            <Pressable onPress={onApply} disabled={applying} style={[styles.applyBtn, applying && styles.disabled]}>
              {applying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.applyText}>
                  Apply → {data.suggestedTargetCalories} kcal
                </Text>
              )}
            </Pressable>
          ) : null}
          {applied != null ? (
            <Text style={styles.success}>Goal updated ({applied > 0 ? "+" : ""}{applied} kcal).</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function Trend({ label, value }: { label: string; value: string }) {
  const { colors, styles } = useThemed(makeStyles);
  return (
    <View style={styles.trendBox}>
      <Text style={styles.trendValue}>{value}</Text>
      <Text style={styles.trendLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adaptiveCard: { borderColor: colors.protein },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  logRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  btn: { backgroundColor: colors.calories, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center" },
  disabled: { opacity: 0.5 },
  btnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },

  trendRow: { flexDirection: "row", gap: 12 },
  trendBox: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12 },
  trendValue: { color: colors.text, fontSize: 18, fontWeight: "800" },
  trendLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  reason: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  applyBtn: { backgroundColor: colors.protein, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  applyText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  success: { color: colors.calories, fontSize: 13, fontWeight: "600" },
  errorText: { color: colors.textMuted, fontSize: 13 },

  listTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 6 },
  empty: { color: colors.textMuted, fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  date: { color: colors.textMuted, fontSize: 14, flex: 1 },
  kg: { color: colors.text, fontSize: 15, fontWeight: "700" },
  del: { color: colors.fat, fontSize: 16, fontWeight: "700" },
});
