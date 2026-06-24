import { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { Icon } from "../../src/components/Icon";
import { OptionList } from "../../src/components/OptionList";
import { NumberField } from "../../src/components/NumberField";
import { useProfileQuery, useUpdateFormula } from "../../src/hooks/useProfile";
import { FORMULA_OPTIONS, type Formula } from "../../src/types/profile";

/** Spiegazioni delle formule BMR, mostrate nel popup (toccando la "ⓘ"). */
const FORMULA_INFO: Record<Formula, { title: string; text: string }> = {
  mifflin: {
    title: "Mifflin-St Jeor",
    text: "The modern default. Estimates your basal metabolism from weight, height, age and sex. It's the most accurate equation for the general population, so it's the recommended choice unless you have a reason to change.",
  },
  harris_benedict: {
    title: "Harris-Benedict (revised)",
    text: "One of the oldest BMR equations, revised in 1984. Also based on weight, height, age and sex, it tends to estimate a little higher than Mifflin-St Jeor. A solid classic alternative.",
  },
  katch_mcardle: {
    title: "Katch-McArdle",
    text: "Estimates your metabolism from lean body mass, so it needs your body-fat %. If you know your body fat reasonably well (e.g. from a scan or calipers) it can be the most accurate — especially if you're very lean or very muscular. Without a body-fat figure it can't be used.",
  },
};

/** Settings (stile "Macros"): formula BMR, aspetto (schermata dedicata), credenziali. */
export default function SettingsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const profile = useProfileQuery();
  const updateFormula = useUpdateFormula();
  const p = profile.data;

  const [bodyFat, setBodyFat] = useState("");
  // Formula scelta in modo "ottimistico": permette di selezionare Katch e far
  // comparire subito il campo body fat anche prima che la mutazione vada a buon fine.
  const [picked, setPicked] = useState<Formula | null>(null);
  // Formula di cui mostrare la spiegazione nel popup (null = popup chiuso).
  const [info, setInfo] = useState<Formula | null>(null);

  const currentFormula: Formula | null = picked ?? p?.formula ?? null;

  // Se si lascia la schermata, scarta la selezione "ottimistica" non confermata:
  // così un Katch-McArdle scelto ma senza body fat applicato torna alla formula
  // davvero salvata (quella del profilo) invece di restare selezionato a vuoto.
  useFocusEffect(
    useCallback(() => {
      return () => setPicked(null);
    }, []),
  );

  // Cambio formula: katch richiede il body fat (mostra il campo + Apply), le altre
  // si applicano subito.
  const onPickFormula = (formula: Formula) => {
    setPicked(formula);
    if (formula === "katch_mcardle") {
      const seed = p?.body_fat_pct != null ? String(p.body_fat_pct) : bodyFat;
      setBodyFat(seed);
      // Senza body fat non applichiamo: il campo qui sotto compare e l'utente preme Apply.
      if (!seed) return;
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

  const showBodyFat = currentFormula === "katch_mcardle";

  return (
    <ScrollView showsVerticalScrollIndicator={false}
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
            <OptionList
              options={FORMULA_OPTIONS}
              value={currentFormula}
              onChange={onPickFormula}
              onInfo={setInfo}
            />
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

      {/* Aspetto: tutto in una schermata dedicata (tema, accento, sfondo, box). */}
      <Text style={styles.group}>Appearance</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={() => router.push("/appearance")}>
          <Icon name="bulb" size={20} color={colors.primary} />
          <Text style={styles.rowLabel}>Theme & colors</Text>
          <Icon name="chevron" size={16} color={colors.textMuted} />
        </Pressable>
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

      {/* Spiegazione della formula toccata (la "ⓘ" nella lista). */}
      <Modal visible={info != null} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setInfo(null)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <Text style={styles.infoTitle}>{info ? FORMULA_INFO[info].title : ""}</Text>
            <Text style={styles.infoText}>{info ? FORMULA_INFO[info].text : ""}</Text>
            <Pressable style={styles.infoOkBtn} onPress={() => setInfo(null)}>
              <Text style={styles.infoOkText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    infoOkBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 4,
    },
    infoOkText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },
  });
