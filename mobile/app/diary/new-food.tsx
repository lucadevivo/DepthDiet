import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { NumberField } from "../../src/components/NumberField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { Icon, type IconName } from "../../src/components/Icon";
import { useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { useI18n } from "../../src/i18n";
import { parseDecimal } from "../../src/lib/num";
import { todayISO } from "../../src/lib/date";
import { useCreateFood } from "../../src/hooks/useFoods";
import { useAddDiaryEntry } from "../../src/hooks/useDiary";
import type { CustomFoodInput } from "../../src/types/food";
import type { AddDiaryBody } from "../../src/types/diary";

type Basis = "per100" | "portion";

const round = (n: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/**
 * #5 — Creazione di un cibo direttamente dal "+ Add" del Diario, con le stesse 3
 * opzioni della libreria Foods (cerca DB, codice a barre, manuale) e in più la
 * possibilità di NON salvarlo in libreria: in quel caso finisce solo in questo
 * pasto come voce singola.
 */
export default function NewFoodScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const router = useRouter();

  const params = useLocalSearchParams<{ meal_id?: string; date?: string }>();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const mealId = params.meal_id ? Number(params.meal_id) : NaN;
  const validMeal = Number.isInteger(mealId);

  const createFood = useCreateFood();
  const addEntry = useAddDiaryEntry(date);

  const [showManual, setShowManual] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [kcal, setKcal] = useState("");
  const [kcalEdited, setKcalEdited] = useState(false);
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  const [basis, setBasis] = useState<Basis>("portion");
  const [portionG, setPortionG] = useState("");
  // Quantità da aggiungere al pasto quando i valori sono per 100 g.
  const [amountG, setAmountG] = useState("");
  // Salvare il cibo nella libreria oppure aggiungerlo solo a questo pasto.
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const BASIS_OPTIONS: { value: Basis; label: string }[] = [
    { value: "per100", label: t("foods.per100") },
    { value: "portion", label: t("foods.perPortion") },
  ];

  const macroP = parseDecimal(p) || 0;
  const macroC = parseDecimal(c) || 0;
  const macroF = parseDecimal(f) || 0;
  const anyMacro = p.trim() !== "" || c.trim() !== "" || f.trim() !== "";
  const autoKcal = Math.round(macroP * 4 + macroC * 4 + macroF * 9);
  const kcalShown = kcalEdited ? kcal : anyMacro ? String(autoKcal) : "";

  const nk = parseDecimal(kcalShown);
  const pg = parseDecimal(portionG);
  const ag = parseDecimal(amountG);

  // Grammi da registrare nel diario: la porzione (basis portion) o la quantità (per100).
  const grams = basis === "portion" ? pg : ag;
  const gramsValid = Number.isFinite(grams) && grams > 0;
  const valid =
    validMeal && name.trim() !== "" && Number.isFinite(nk) && nk >= 0 && gramsValid;

  const pending = createFood.isPending || addEntry.isPending;

  const onSubmit = async () => {
    if (!valid) return;
    // Porta i valori inseriti a "per 100 g".
    const baseG = basis === "portion" ? pg : 100;
    const factor = 100 / baseG;
    const per100 = {
      kcal_per_100: round(nk * factor),
      protein_per_100: round(macroP * factor),
      carbs_per_100: round(macroC * factor),
      fat_per_100: round(macroF * factor),
    };
    try {
      if (saveToLibrary) {
        // Salva l'Alimento e poi aggiungilo al pasto (i macro li ricalcola il server).
        const input: CustomFoodInput = {
          name: name.trim(),
          brand: brand.trim() || null,
          ...per100,
          default_serving_g: basis === "portion" ? pg : null,
        };
        const food = await createFood.mutateAsync(input);
        const body: AddDiaryBody = {
          date,
          meal_id: mealId,
          type: "custom_food",
          food_id: food.id,
          grams,
        };
        await addEntry.mutateAsync(body);
      } else {
        // Voce singola, non salvata in libreria: macro calcolati per la quantità.
        const k = grams / 100;
        const body: AddDiaryBody = {
          date,
          meal_id: mealId,
          type: "manual",
          description: name.trim(),
          grams,
          kcal: round(per100.kcal_per_100 * k, 0),
          protein_g: round(per100.protein_per_100 * k),
          carbs_g: round(per100.carbs_per_100 * k),
          fat_g: round(per100.fat_per_100 * k),
        };
        await addEntry.mutateAsync(body);
      }
      router.back();
    } catch {
      // L'errore è mostrato sotto al bottone.
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title={t("newFood.title")} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>{t("newFood.lead")}</Text>

        {/* Le stesse 3 opzioni della libreria Foods. */}
        <OptionRow
          icon="search"
          title={t("newFood.searchTitle")}
          subtitle={t("newFood.searchSub")}
          onPress={() => router.push("/off-search")}
        />
        <OptionRow
          icon="barcode"
          title={t("newFood.barcodeTitle")}
          subtitle={t("newFood.barcodeSub")}
          onPress={() => router.push("/scan")}
        />
        <OptionRow
          icon="add"
          title={t("newFood.manualTitle")}
          subtitle={t("newFood.manualSub")}
          onPress={() => setShowManual((v) => !v)}
          open={showManual}
        />

        {showManual ? (
          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder={t("foods.namePlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder={t("foods.brandPlaceholder")}
              placeholderTextColor={colors.textMuted}
              value={brand}
              onChangeText={setBrand}
            />

            <Text style={styles.fieldLabel}>{t("foods.valuesAreFor")}</Text>
            <SegmentedControl options={BASIS_OPTIONS} value={basis} onChange={setBasis} />
            {basis === "portion" ? (
              <NumberField
                label={t("foods.portionSize")}
                value={portionG}
                onChangeText={setPortionG}
                unit="g"
                placeholder={t("common.eg", { v: 55 })}
              />
            ) : null}

            <View style={styles.row}>
              <NumberField
                label="Kcal"
                value={kcalShown}
                onChangeText={(tx) => {
                  setKcal(tx);
                  setKcalEdited(tx.trim() !== "");
                }}
              />
              <NumberField label={t("common.protein")} value={p} onChangeText={setP} unit="g" />
            </View>
            <View style={styles.row}>
              <NumberField label={t("common.carbs")} value={c} onChangeText={setC} unit="g" />
              <NumberField label={t("common.fat")} value={f} onChangeText={setF} unit="g" />
            </View>

            {/* Per i valori per 100 g serve la quantità effettiva da registrare. */}
            {basis === "per100" ? (
              <NumberField
                label={t("newFood.amountToAdd")}
                value={amountG}
                onChangeText={setAmountG}
                unit="g"
                placeholder={t("common.eg", { v: 150 })}
              />
            ) : null}

            {/* Toggle salva-in-libreria (#5). */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>{t("newFood.saveToLibrary")}</Text>
                <Text style={styles.switchHint}>
                  {saveToLibrary ? t("newFood.saveToLibraryOn") : t("newFood.saveToLibraryOff")}
                </Text>
              </View>
              <Switch
                value={saveToLibrary}
                onValueChange={setSaveToLibrary}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>

            <Pressable
              onPress={onSubmit}
              disabled={!valid || pending}
              style={[styles.btn, (!valid || pending) && styles.disabled]}
            >
              {pending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.btnText}>{t("newFood.addToMeal")}</Text>
              )}
            </Pressable>
            {createFood.isError || addEntry.isError ? (
              <Text style={styles.error}>{t("common.genericError")}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Riga-opzione (icona, titolo, spiegazione, chevron) — come nella libreria Foods. */
function OptionRow({
  icon,
  title,
  subtitle,
  onPress,
  open,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  open?: boolean;
}) {
  const { colors, styles } = useThemed(makeStyles);
  return (
    <Pressable style={styles.optionRow} onPress={onPress}>
      <View style={styles.optionTile}>
        <Icon name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSub}>{subtitle}</Text>
      </View>
      <Icon name={open ? "close" : "chevron"} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12, paddingBottom: 60 },
    lead: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },

    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionTile: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary + "22",
      alignItems: "center",
      justifyContent: "center",
    },
    optionTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
    optionSub: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },

    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 2 },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 16,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    row: { flexDirection: "row", gap: 10 },
    switchRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 },
    switchLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
    switchHint: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
    btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    disabled: { opacity: 0.5 },
    btnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },
    error: { color: colors.fat, fontSize: 13 },
  });
