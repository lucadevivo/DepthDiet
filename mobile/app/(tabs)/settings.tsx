import { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { useI18n } from "../../src/i18n";
import { Icon } from "../../src/components/Icon";
import { OptionList } from "../../src/components/OptionList";
import { NumberField } from "../../src/components/NumberField";
import { useProfileQuery, useUpdateFormula } from "../../src/hooks/useProfile";
import { FORMULA_OPTIONS, type Formula } from "../../src/types/profile";

/** Settings (stile "Macros"): formula BMR, aspetto (schermata dedicata), credenziali. */
export default function SettingsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t, lang, setLang, languages } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Popup di scelta lingua (#7).
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = languages.find((l) => l.code === lang);

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

  // Opzioni formula localizzate (etichetta + descrizione brevi).
  const formulaOptions = FORMULA_OPTIONS.map((o) => ({
    value: o.value,
    label: t(`formula.${o.value}`),
    desc: t(`formula.${o.value}.desc`),
  }));

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
    <View style={styles.screen}>
      {/* Titolo fisso in alto: resta in cima quando si scorre (come il Diary). */}
      <View style={[styles.titleBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.heading}>{t("settings.title")}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      {/* Lingua (#7): app + lingua delle risposte dell'IA. */}
      <Text style={styles.group}>{t("settings.languageGroup")}</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={() => setLangOpen(true)}>
          <Icon name="bulb" size={20} color={colors.primary} />
          <Text style={styles.rowLabel}>{t("settings.languageRow")}</Text>
          <Text style={styles.langValue}>
            {currentLang ? `${currentLang.flag} ${currentLang.name}` : lang}
          </Text>
          <Icon name="chevron" size={16} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.muted}>{t("settings.languageHint")}</Text>
      </View>

      {/* Formula BMR */}
      <Text style={styles.group}>{t("settings.calculation")}</Text>
      <View style={styles.card}>
        {profile.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : p?.target_calories == null ? (
          <Text style={styles.muted}>{t("settings.setupFirst")}</Text>
        ) : (
          <>
            <Text style={styles.cardTitle}>{t("settings.bmrFormula")}</Text>
            <OptionList
              options={formulaOptions}
              value={currentFormula}
              onChange={onPickFormula}
              onInfo={setInfo}
            />
            {showBodyFat ? (
              <View style={styles.katch}>
                <NumberField label={t("settings.bodyFat")} value={bodyFat} onChangeText={setBodyFat} unit="%" />
                <Pressable
                  onPress={applyKatch}
                  disabled={updateFormula.isPending}
                  style={[styles.applyBtn, updateFormula.isPending && styles.disabled]}
                >
                  <Text style={styles.applyText}>{t("settings.apply")}</Text>
                </Pressable>
              </View>
            ) : null}
            {updateFormula.isSuccess ? (
              <Text style={styles.ok}>
                {t("settings.updated", {
                  bmr: updateFormula.data.computation.bmr,
                  tdee: updateFormula.data.computation.tdee,
                })}
              </Text>
            ) : null}
            {updateFormula.isError ? (
              <Text style={styles.err}>{t("settings.formulaError")}</Text>
            ) : null}
          </>
        )}
      </View>

      {/* Aspetto: tutto in una schermata dedicata (tema, accento, sfondo, box). */}
      <Text style={styles.group}>{t("settings.appearance")}</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={() => router.push("/appearance")}>
          <Icon name="bulb" size={20} color={colors.primary} />
          <Text style={styles.rowLabel}>{t("settings.themeColors")}</Text>
          <Icon name="chevron" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Account */}
      <Text style={styles.group}>{t("settings.account")}</Text>
      <View style={styles.card}>
        <Pressable style={styles.row} onPress={() => router.push("/setup")}>
          <Icon name="settings" size={20} color={colors.primary} />
          <Text style={styles.rowLabel}>{t("settings.credentials")}</Text>
          <Icon name="chevron" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Scelta lingua (#7). */}
      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setLangOpen(false)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <Text style={styles.infoTitle}>{t("settings.languageRow")}</Text>
            {languages.map((l) => {
              const active = l.code === lang;
              return (
                <Pressable
                  key={l.code}
                  style={[styles.langRow, active && styles.langRowActive]}
                  onPress={() => {
                    setLang(l.code);
                    setLangOpen(false);
                  }}
                >
                  <Text style={styles.langFlag}>{l.flag}</Text>
                  <Text style={[styles.langName, active && styles.langNameActive]}>{l.name}</Text>
                  {active ? <Icon name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Spiegazione della formula toccata (la "ⓘ" nella lista). */}
      <Modal visible={info != null} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setInfo(null)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <Text style={styles.infoTitle}>{info ? t(`formula.${info}`) : ""}</Text>
            <Text style={styles.infoText}>{info ? t(`formulaInfo.${info}.text`) : ""}</Text>
            <Pressable style={styles.infoOkBtn} onPress={() => setInfo(null)}>
              <Text style={styles.infoOkText}>{t("common.gotIt")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    titleBar: { paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.bg },
    content: { padding: 16, paddingTop: 4, gap: 8, paddingBottom: 40 },
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
    langValue: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
    langRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
    },
    langRowActive: { backgroundColor: colors.surfaceAlt },
    langFlag: { fontSize: 22 },
    langName: { color: colors.text, fontSize: 16, fontWeight: "600", flex: 1 },
    langNameActive: { fontWeight: "800", color: colors.primary },
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
