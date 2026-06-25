import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { useProfileQuery, useUpdateDiet } from "../../src/hooks/useProfile";
import { MacroDonut } from "../../src/components/MacroDonut";
import { MetricCard } from "../../src/components/MetricCard";
import { NumberField } from "../../src/components/NumberField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { Icon } from "../../src/components/Icon";
import { parseDecimal } from "../../src/lib/num";
import {
  DIET_PRESET_OPTIONS,
  type DietPreset,
  type MacroPercentages,
} from "../../src/types/profile";

/** Etichetta breve "C 50 · P 20 · F 30" per un preset. */
function pctLabel(pct: MacroPercentages): string {
  return `C ${Math.round(pct.carbs_pct)} · P ${Math.round(pct.protein_pct)} · F ${Math.round(pct.fat_pct)}`;
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
  const [infoOpen, setInfoOpen] = useState(false);
  // Selezione "ottimistica" del preset: l'evidenza si sposta SUBITO sul preset
  // toccato, senza aspettare la mutazione (altrimenti per un istante resta il
  // vecchio valore della cache → flash visivo). `picked` torna null quando il
  // preset salvato cambia davvero. L'editor custom è aperto se il selezionato è custom.
  const [picked, setPicked] = useState<DietPreset | null>(null);
  useEffect(() => {
    setPicked(null);
  }, [p?.diet_preset]);
  const selectedPreset: DietPreset = picked ?? p?.diet_preset ?? "standard";
  const customOpen = selectedPreset === "custom";

  const noTargets = !p || p.target_calories == null;

  return (
    <View style={styles.screen}>
      {/* Titolo fisso in alto: resta in cima quando si scorre (come il Diary). */}
      <View style={[styles.titleBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.heading}>Goals</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      {profile.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : noTargets ? (
        <View style={styles.card}>
          <Text style={styles.note}>Set your data in the Profile tab to compute your goals.</Text>
        </View>
      ) : (
        <>
          {/* Fabbisogno calorico giornaliero: stile metrica (come BMR/BMI). Tap → spiegazione.
              Colore icona FISSO (non segue l'accento del tema). */}
          <MetricCard
            icon="goal"
            iconColor="#22C55E"
            label="Daily caloric requirement"
            value={`${p!.target_calories} kcal`}
            onPress={() => setInfoOpen(true)}
            info
          />

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
                const active = opt.value === selectedPreset;
                const desc =
                  opt.value === "custom"
                    ? p!.diet_preset === "custom" && p!.diet_carbs_pct != null
                      ? pctLabel({
                          carbs_pct: p!.diet_carbs_pct,
                          protein_pct: p!.diet_protein_pct ?? 0,
                          fat_pct: p!.diet_fat_pct ?? 0,
                        })
                      : "Custom split (% or g/kg)"
                    : pctLabel(opt.pct!);
                return (
                  <Pressable
                    key={opt.value}
                    disabled={updateDiet.isPending}
                    onPress={() => {
                      setPicked(opt.value); // evidenza immediata (no flash)
                      if (opt.value === "custom") return; // apre l'editor, niente mutazione
                      if (opt.value === p!.diet_preset) return; // già salvato
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

            {customOpen ? (
              <CustomEditor
                initial={
                  p!.diet_carbs_pct != null
                    ? {
                        carbs_pct: p!.diet_carbs_pct,
                        protein_pct: p!.diet_protein_pct ?? 0,
                        fat_pct: p!.diet_fat_pct ?? 0,
                      }
                    : { carbs_pct: 40, protein_pct: 30, fat_pct: 30 }
                }
                weightKg={p!.weight_kg ?? 0}
                targetCalories={p!.target_calories ?? 0}
                pending={updateDiet.isPending}
                onApply={(custom_pct) => updateDiet.mutate({ diet_preset: "custom", custom_pct })}
              />
            ) : null}

            {updateDiet.isError ? (
              <Text style={styles.errorText}>Could not update. Try again.</Text>
            ) : null}
          </View>

          <Modal
            visible={infoOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setInfoOpen(false)}
          >
            <Pressable style={styles.infoBackdrop} onPress={() => setInfoOpen(false)}>
              <Pressable style={styles.infoCard} onPress={() => {}}>
                <Text style={styles.infoTitle}>Daily caloric requirement</Text>
                <Text style={styles.infoText}>
                  The total calories you should eat per day to reach your goal. It starts from the
                  energy you burn in a day (your maintenance, or TDEE) and adjusts it for your goal —
                  a deficit to lose weight, a surplus to gain. Your macros below are split from this
                  number.
                </Text>
                <Pressable style={styles.infoBtn} onPress={() => setInfoOpen(false)}>
                  <Text style={styles.infoBtnText}>Got it</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
      </ScrollView>
    </View>
  );
}

type CustomMode = "pct" | "gkg";
const MODE_OPTIONS: { value: CustomMode; label: string }[] = [
  { value: "pct", label: "Percent" },
  { value: "gkg", label: "g per kg" },
];

/**
 * Editor della ripartizione custom dei macro, in due modi:
 *  - Percent: 3 percentuali (C/P/F) che sommano a 100;
 *  - g per kg: proteine e grassi in grammi per kg di peso (esatti), i carboidrati
 *    riempiono le calorie giornaliere rimanenti. Se proteine+grassi superano già
 *    le calorie obiettivo, mostra errore e non applica.
 * In entrambi i casi si applica come `custom_pct` (percentuali) all'endpoint dieta.
 */
function CustomEditor({
  initial,
  weightKg,
  targetCalories,
  pending,
  onApply,
}: {
  initial: MacroPercentages;
  weightKg: number;
  targetCalories: number;
  pending: boolean;
  onApply: (pct: MacroPercentages) => void;
}) {
  const { colors, styles } = useThemed(makeStyles);
  const [mode, setMode] = useState<CustomMode>("pct");

  // --- Percent ---
  const [carbs, setCarbs] = useState(String(initial.carbs_pct));
  const [protein, setProtein] = useState(String(initial.protein_pct));
  const [fat, setFat] = useState(String(initial.fat_pct));
  const c = Number.parseInt(carbs, 10);
  const pr = Number.parseInt(protein, 10);
  const f = Number.parseInt(fat, 10);
  const sum = (Number.isFinite(c) ? c : 0) + (Number.isFinite(pr) ? pr : 0) + (Number.isFinite(f) ? f : 0);
  const pctValid =
    [c, pr, f].every((x) => Number.isFinite(x) && x >= 0 && x <= 100) && Math.abs(sum - 100) <= 1;

  // --- g per kg (proteine + grassi; i carbo riempiono) ---
  const [proteinPerKg, setProteinPerKg] = useState("");
  const [fatPerKg, setFatPerKg] = useState("");
  const ppk = parseDecimal(proteinPerKg);
  const fpk = parseDecimal(fatPerKg);
  const gkgInputsOk = Number.isFinite(ppk) && ppk > 0 && Number.isFinite(fpk) && fpk > 0 && weightKg > 0;
  const proteinG = gkgInputsOk ? ppk * weightKg : 0;
  const fatG = gkgInputsOk ? fpk * weightKg : 0;
  const pfKcal = proteinG * 4 + fatG * 9;
  const remainingKcal = targetCalories - pfKcal;
  const carbsG = remainingKcal > 0 ? remainingKcal / 4 : 0;
  const gkgOver = gkgInputsOk && remainingKcal <= 0; // proteine+grassi sforano le calorie
  const gkgValid = gkgInputsOk && remainingKcal > 0 && targetCalories > 0;

  const applyGkg = () => {
    if (!gkgValid) return;
    // Percentuali (intere) sulle calorie obiettivo che riproducono i grammi di
    // proteine/grassi; i carboidrati prendono il resto. Arrotondiamo a numeri interi
    // così non restano decimali infiniti, e ricaviamo i carbo per differenza così la
    // somma resta esattamente 100.
    const protein_pct = Math.round((proteinG * 4) / targetCalories * 100);
    const fat_pct = Math.round((fatG * 9) / targetCalories * 100);
    const carbs_pct = 100 - protein_pct - fat_pct;
    onApply({ carbs_pct, protein_pct, fat_pct });
  };

  return (
    <View style={styles.customBox}>
      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

      {mode === "pct" ? (
        <>
          <View style={styles.fieldRow}>
            <NumberField label="Carbs %" value={carbs} onChangeText={setCarbs} unit="%" />
            <NumberField label="Protein %" value={protein} onChangeText={setProtein} unit="%" />
            <NumberField label="Fat %" value={fat} onChangeText={setFat} unit="%" />
          </View>
          <Text style={[styles.sumText, !pctValid && styles.sumTextBad]}>
            Total: {sum}% (must be 100%)
          </Text>
          <Pressable
            disabled={!pctValid || pending}
            onPress={() => onApply({ carbs_pct: c, protein_pct: pr, fat_pct: f })}
            style={[styles.applyBtn, (!pctValid || pending) && styles.applyBtnDisabled]}
          >
            {pending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.applyText}>Apply custom split</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.gkgHint}>
            Set protein and fat per kg of body weight ({weightKg} kg). Carbs fill the rest of your{" "}
            {targetCalories} kcal goal.
          </Text>
          <View style={styles.fieldRow}>
            <NumberField
              label="Protein"
              value={proteinPerKg}
              onChangeText={setProteinPerKg}
              unit="g/kg"
              placeholder="e.g. 2"
            />
            <NumberField
              label="Fat"
              value={fatPerKg}
              onChangeText={setFatPerKg}
              unit="g/kg"
              placeholder="e.g. 1"
            />
          </View>

          {gkgOver ? (
            <Text style={styles.sumTextBad}>
              Protein + fat already use {Math.round(pfKcal)} kcal, over your {targetCalories} kcal
              goal. Lower them.
            </Text>
          ) : gkgValid ? (
            <Text style={styles.gkgPreview}>
              Protein {Math.round(proteinG)} g · Carbs {Math.round(carbsG)} g · Fat{" "}
              {Math.round(fatG)} g
            </Text>
          ) : null}

          <Pressable
            disabled={!gkgValid || pending}
            onPress={applyGkg}
            style={[styles.applyBtn, (!gkgValid || pending) && styles.applyBtnDisabled]}
          >
            {pending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.applyText}>Apply custom split</Text>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  titleBar: { paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 8, gap: 16, paddingBottom: 40 },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800" },

  infoBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
  },
  infoTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  infoText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  infoBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  infoBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },

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

  customBox: { gap: 12, backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 14 },
  fieldRow: { flexDirection: "row", gap: 10 },
  sumText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  sumTextBad: { color: colors.fat, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  gkgHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  gkgPreview: { color: colors.text, fontSize: 13, fontWeight: "700" },
  applyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  applyBtnDisabled: { opacity: 0.5 },
  applyText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },

  note: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  errorText: { color: colors.fat, fontSize: 13 },
});
