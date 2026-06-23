import { useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { useProfileQuery, useUpdateDiet } from "../../src/hooks/useProfile";
import { MacroDonut } from "../../src/components/MacroDonut";
import { NumberField } from "../../src/components/NumberField";
import { Icon } from "../../src/components/Icon";
import {
  DIET_PRESET_OPTIONS,
  type DietPreset,
  type MacroPercentages,
} from "../../src/types/profile";

/** Etichetta breve "C 50 · P 20 · F 30" per un preset. */
function pctLabel(pct: MacroPercentages): string {
  return `C ${pct.carbs_pct} · P ${pct.protein_pct} · F ${pct.fat_pct}`;
}

/**
 * Goals (stile "Macros"): fabbisogno calorico giornaliero + scelta del preset
 * dieta, che ricalcola i macro sul backend e li mostra come barra a segmenti.
 */
export default function GoalsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const profile = useProfileQuery();
  const updateDiet = useUpdateDiet();
  const p = profile.data;

  const noTargets = !p || p.target_calories == null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Goals</Text>

      {profile.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : noTargets ? (
        <View style={styles.card}>
          <Text style={styles.note}>Set your data in the Profile tab to compute your goals.</Text>
        </View>
      ) : (
        <>
          {/* Fabbisogno calorico giornaliero (numero grande). */}
          <View style={styles.heroCard}>
            <Text style={styles.heroKicker}>DAILY CALORIC REQUIREMENT</Text>
            <Text style={styles.heroValue}>{p!.target_calories} kcal</Text>
          </View>

          {/* Macronutrienti correnti. */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Macronutrients</Text>
            <MacroDonut
              protein_g={p!.target_protein_g ?? 0}
              carbs_g={p!.target_carbs_g ?? 0}
              fat_g={p!.target_fat_g ?? 0}
            />
          </View>

          {/* Selettore preset dieta. */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Diet preset</Text>
            <View style={{ gap: 8 }}>
              {DIET_PRESET_OPTIONS.map((opt) => {
                const active = p!.diet_preset === opt.value;
                const desc =
                  opt.value === "custom"
                    ? p!.diet_preset === "custom" && p!.diet_carbs_pct != null
                      ? pctLabel({
                          carbs_pct: p!.diet_carbs_pct,
                          protein_pct: p!.diet_protein_pct ?? 0,
                          fat_pct: p!.diet_fat_pct ?? 0,
                        })
                      : "Free percentages"
                    : pctLabel(opt.pct!);
                return (
                  <Pressable
                    key={opt.value}
                    disabled={updateDiet.isPending}
                    onPress={() => {
                      if (opt.value === "custom") return; // gestito dall'editor sotto
                      if (active) return;
                      updateDiet.mutate({ diet_preset: opt.value });
                    }}
                    style={[styles.presetRow, active && styles.presetRowActive]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.presetDesc}>{desc}</Text>
                    </View>
                    {active ? <Icon name="check" size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <CustomEditor
              active={p!.diet_preset === "custom"}
              initial={
                p!.diet_carbs_pct != null
                  ? {
                      carbs_pct: p!.diet_carbs_pct,
                      protein_pct: p!.diet_protein_pct ?? 0,
                      fat_pct: p!.diet_fat_pct ?? 0,
                    }
                  : { carbs_pct: 40, protein_pct: 30, fat_pct: 30 }
              }
              pending={updateDiet.isPending}
              onApply={(custom_pct) => updateDiet.mutate({ diet_preset: "custom", custom_pct })}
            />

            {updateDiet.isError ? (
              <Text style={styles.errorText}>Could not update. Try again.</Text>
            ) : null}
          </View>

        </>
      )}
    </ScrollView>
  );
}

/** Editor delle percentuali custom: 3 campi + Apply, valida la somma ≈ 100. */
function CustomEditor({
  active,
  initial,
  pending,
  onApply,
}: {
  active: boolean;
  initial: MacroPercentages;
  pending: boolean;
  onApply: (pct: MacroPercentages) => void;
}) {
  const { colors, styles } = useThemed(makeStyles);
  const [open, setOpen] = useState(active);
  const [carbs, setCarbs] = useState(String(initial.carbs_pct));
  const [protein, setProtein] = useState(String(initial.protein_pct));
  const [fat, setFat] = useState(String(initial.fat_pct));

  const c = Number.parseInt(carbs, 10);
  const pr = Number.parseInt(protein, 10);
  const f = Number.parseInt(fat, 10);
  const sum = (Number.isFinite(c) ? c : 0) + (Number.isFinite(pr) ? pr : 0) + (Number.isFinite(f) ? f : 0);
  const valid = [c, pr, f].every((x) => Number.isFinite(x) && x >= 0 && x <= 100) && Math.abs(sum - 100) <= 1;

  if (!open) {
    return (
      <Pressable style={styles.customToggle} onPress={() => setOpen(true)}>
        <Text style={styles.customToggleText}>Set custom percentages</Text>
        <Icon name="chevron" size={16} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={styles.customBox}>
      <View style={styles.fieldRow}>
        <NumberField label="Carbs %" value={carbs} onChangeText={setCarbs} unit="%" />
        <NumberField label="Protein %" value={protein} onChangeText={setProtein} unit="%" />
        <NumberField label="Fat %" value={fat} onChangeText={setFat} unit="%" />
      </View>
      <Text style={[styles.sumText, !valid && styles.sumTextBad]}>Total: {sum}% (must be 100%)</Text>
      <Pressable
        disabled={!valid || pending}
        onPress={() => onApply({ carbs_pct: c, protein_pct: pr, fat_pct: f })}
        style={[styles.applyBtn, (!valid || pending) && styles.applyBtnDisabled]}
      >
        {pending ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.applyText}>Apply custom split</Text>
        )}
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800" },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroKicker: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  heroValue: { color: colors.primary, fontSize: 38, fontWeight: "800" },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },

  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetRowActive: { borderColor: colors.primary },
  presetLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
  presetLabelActive: { color: colors.primary },
  presetDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  customToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  customToggleText: { color: colors.textMuted, fontSize: 13, fontWeight: "700" },
  customBox: { gap: 12, backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 14 },
  fieldRow: { flexDirection: "row", gap: 10 },
  sumText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  sumTextBad: { color: colors.fat },
  applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  applyBtnDisabled: { opacity: 0.5 },
  applyText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },

  note: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  errorText: { color: colors.fat, fontSize: 13 },
});
