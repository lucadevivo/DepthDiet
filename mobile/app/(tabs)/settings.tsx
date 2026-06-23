import { useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme, useThemed, type ThemeMode } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { Icon } from "../../src/components/Icon";
import { OptionList } from "../../src/components/OptionList";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { NumberField } from "../../src/components/NumberField";
import { useProfileQuery, useUpdateFormula } from "../../src/hooks/useProfile";
import { FORMULA_OPTIONS, type Formula } from "../../src/types/profile";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

/** Settings (stile "Macros"): formula BMR, tema dark/light/system, credenziali. */
export default function SettingsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const profile = useProfileQuery();
  const updateFormula = useUpdateFormula();
  const p = profile.data;

  const [bodyFat, setBodyFat] = useState("");

  // Cambio formula: katch richiede il body fat (mostra il campo + Apply), le altre
  // si applicano subito.
  const onPickFormula = (formula: Formula) => {
    if (formula === "katch_mcardle") {
      const seed = p?.body_fat_pct != null ? String(p.body_fat_pct) : bodyFat;
      setBodyFat(seed);
      if (!seed) return; // serve il body fat: l'utente lo inserisce e preme Apply
      updateFormula.mutate({ formula, body_fat_pct: Number.parseFloat(seed) });
      return;
    }
    updateFormula.mutate({ formula });
  };

  const applyKatch = () => {
    const bf = Number.parseFloat(bodyFat);
    if (!Number.isFinite(bf) || bf < 1 || bf > 70) return;
    updateFormula.mutate({ formula: "katch_mcardle", body_fat_pct: bf });
  };

  const showBodyFat = p?.formula === "katch_mcardle";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Settings</Text>

      {/* Formula BMR */}
      <Text style={styles.group}>Calculation</Text>
      <View style={styles.card}>
        {profile.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : p?.target_calories == null ? (
          <Text style={styles.muted}>Set up your Profile first to pick a BMR formula.</Text>
        ) : (
          <>
            <Text style={styles.cardTitle}>BMR formula</Text>
            <OptionList options={FORMULA_OPTIONS} value={p.formula} onChange={onPickFormula} />
            {showBodyFat ? (
              <View style={styles.katch}>
                <NumberField label="Body fat %" value={bodyFat} onChangeText={setBodyFat} unit="%" />
                <Pressable
                  onPress={applyKatch}
                  disabled={updateFormula.isPending}
                  style={[styles.applyBtn, updateFormula.isPending && styles.disabled]}
                >
                  <Text style={styles.applyText}>Apply</Text>
                </Pressable>
              </View>
            ) : null}
            {updateFormula.isSuccess ? (
              <Text style={styles.ok}>
                Updated — BMR {updateFormula.data.computation.bmr} · TDEE{" "}
                {updateFormula.data.computation.tdee} kcal
              </Text>
            ) : null}
            {updateFormula.isError ? (
              <Text style={styles.err}>Could not update the formula. Try again.</Text>
            ) : null}
          </>
        )}
      </View>

      {/* Tema */}
      <Text style={styles.group}>Appearance</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Theme</Text>
        <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />
      </View>

      {/* Account */}
      <Text style={styles.group}>Account</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={() => router.push("/setup")}>
          <Icon name="settings" size={20} color={colors.primary} />
          <Text style={styles.rowLabel}>Credentials & connection</Text>
          <Icon name="chevron" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 8, paddingBottom: 40 },
    heading: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: 8 },
    group: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
    muted: { color: colors.textMuted, fontSize: 14 },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    rowLabel: { color: colors.text, fontSize: 15, fontWeight: "600", flex: 1 },
    katch: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
    applyBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignItems: "center",
      marginBottom: 0,
    },
    disabled: { opacity: 0.5 },
    applyText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },
    ok: { color: colors.primary, fontSize: 13, fontWeight: "600" },
    err: { color: colors.fat, fontSize: 13 },
  });
