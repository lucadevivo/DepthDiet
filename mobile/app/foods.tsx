import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { Icon, type IconName } from "../src/components/Icon";
import { useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { useI18n } from "../src/i18n";
import { parseDecimal } from "../src/lib/num";
import { useCreateFood, useDeleteFood, useFoodsQuery, useUpdateFood } from "../src/hooks/useFoods";
import type { CustomFood, CustomFoodInput } from "../src/types/food";

type Basis = "per100" | "portion";

export default function FoodsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const router = useRouter();
  const foods = useFoodsQuery();
  const createFood = useCreateFood();
  const updateFood = useUpdateFood();
  const deleteFood = useDeleteFood();

  const BASIS_OPTIONS: { value: Basis; label: string }[] = [
    { value: "per100", label: t("foods.per100") },
    { value: "portion", label: t("foods.perPortion") },
  ];

  // Conferma prima di eliminare un cibo (azione irreversibile).
  const confirmDelete = (food: CustomFood) => {
    Alert.alert(t("foods.deleteTitle"), t("foods.deleteMsg", { name: food.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteFood.mutate(food.id) },
    ]);
  };

  const [showManual, setShowManual] = useState(false);
  // Alimento in modifica (null = creazione di uno nuovo).
  const [editing, setEditing] = useState<CustomFood | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [kcal, setKcal] = useState("");
  // true quando l'utente ha scritto le calorie a mano: in quel caso non le
  // ricalcoliamo dai macro. Svuotando il campo si torna al calcolo automatico.
  const [kcalEdited, setKcalEdited] = useState(false);
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  // Base dei valori inseriti: per 100 g (standard) oppure per una porzione scelta.
  const [basis, setBasis] = useState<Basis>("per100");
  const [portionG, setPortionG] = useState("");

  const macroP = parseDecimal(p) || 0;
  const macroC = parseDecimal(c) || 0;
  const macroF = parseDecimal(f) || 0;
  const anyMacro = p.trim() !== "" || c.trim() !== "" || f.trim() !== "";
  // Calorie automatiche dai macro (4/4/9 kcal per g). Se l'utente le ha scritte
  // a mano usiamo le sue, altrimenti quelle calcolate.
  const autoKcal = Math.round(macroP * 4 + macroC * 4 + macroF * 9);
  const kcalShown = kcalEdited ? kcal : anyMacro ? String(autoKcal) : "";

  const nk = parseDecimal(kcalShown);
  const pg = parseDecimal(portionG);
  const portionValid = basis === "per100" || (Number.isFinite(pg) && pg > 0);
  const valid = name.trim() !== "" && Number.isFinite(nk) && nk >= 0 && portionValid;

  const pending = createFood.isPending || updateFood.isPending;
  const isError = createFood.isError || updateFood.isError;

  const resetForm = () => {
    setEditing(null);
    setName("");
    setBrand("");
    setKcal("");
    setKcalEdited(false);
    setP("");
    setC("");
    setF("");
    setBasis("per100");
    setPortionG("");
    setShowManual(false);
  };

  // Apre il form pre-compilato per modificare un alimento già creato. I valori
  // salvati sono sempre per 100 g.
  const startEdit = (food: CustomFood) => {
    setEditing(food);
    setName(food.name);
    setBrand(food.brand ?? "");
    setKcal(String(food.kcal_per_100));
    setKcalEdited(true); // mostra il valore salvato; resta modificabile
    setP(String(food.protein_per_100));
    setC(String(food.carbs_per_100));
    setF(String(food.fat_per_100));
    setBasis("per100");
    setPortionG("");
    setShowManual(true);
  };

  const onSubmit = () => {
    if (!valid) return;
    // Converte i valori inseriti (per 100 g o per la porzione) in valori per 100 g,
    // che è come il backend memorizza gli alimenti. Se l'utente ha specificato una
    // porzione, la salva anche come grammatura predefinita.
    const baseG = basis === "portion" ? pg : 100;
    const factor = 100 / baseG;
    const input: CustomFoodInput = {
      name: name.trim(),
      brand: brand.trim() || null,
      kcal_per_100: Math.round(nk * factor * 10) / 10,
      protein_per_100: Math.round(macroP * factor * 10) / 10,
      carbs_per_100: Math.round(macroC * factor * 10) / 10,
      fat_per_100: Math.round(macroF * factor * 10) / 10,
      // In modifica (basis per 100 g) preserviamo porzione e barcode esistenti.
      default_serving_g: basis === "portion" ? pg : (editing?.default_serving_g ?? null),
      barcode: editing?.barcode ?? undefined,
    };
    if (editing) {
      updateFood.mutate({ id: editing.id, input }, { onSuccess: resetForm });
    } else {
      createFood.mutate(input, { onSuccess: resetForm });
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("foods.title")} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t("foods.lead")}</Text>

        <Text style={styles.section}>{t("foods.addFood")}</Text>

        {/* 3 modi per aggiungere un alimento, ognuno spiegato. */}
        <OptionRow
          icon="search"
          title={t("foods.optSearchTitle")}
          subtitle={t("foods.optSearchSub")}
          onPress={() => router.push("/off-search")}
        />
        <OptionRow
          icon="barcode"
          title={t("foods.optBarcodeTitle")}
          subtitle={t("foods.optBarcodeSub")}
          onPress={() => router.push("/scan")}
        />
        <OptionRow
          icon="add"
          title={t("foods.optManualTitle")}
          subtitle={t("foods.optManualSub")}
          onPress={() => (showManual ? resetForm() : setShowManual(true))}
          open={showManual}
        />

        {showManual ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editing ? t("foods.editFood") : t("foods.newFood")}</Text>
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

            {/* Base dei valori: standard (100 g) o una porzione decisa dall'utente. */}
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
                  // Campo svuotato → torna alle calorie calcolate dai macro.
                  setKcalEdited(tx.trim() !== "");
                }}
              />
              <NumberField label={t("common.protein")} value={p} onChangeText={setP} unit="g" />
            </View>
            <View style={styles.row}>
              <NumberField label={t("common.carbs")} value={c} onChangeText={setC} unit="g" />
              <NumberField label={t("common.fat")} value={f} onChangeText={setF} unit="g" />
            </View>
            <Text style={styles.basisHint}>
              {kcalEdited ? t("foods.kcalManual") : t("foods.kcalAuto")}
            </Text>
            <Text style={styles.basisHint}>
              {basis === "portion" ? t("foods.macrosPortionHint") : t("foods.macrosPer100Hint")}
            </Text>
            <Pressable
              onPress={onSubmit}
              disabled={!valid || pending}
              style={[styles.btn, (!valid || pending) && styles.disabled]}
            >
              {pending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.btnText}>{editing ? t("common.saveChanges") : t("foods.saveFood")}</Text>
              )}
            </Pressable>
            {isError ? <Text style={styles.error}>{t("foods.couldNotSave")}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.section}>{t("foods.yourFoods")}</Text>
        {foods.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : foods.isError ? (
          <Text style={styles.error}>{t("foods.loadError")}</Text>
        ) : (foods.data ?? []).length === 0 ? (
          <Text style={styles.empty}>{t("foods.none")}</Text>
        ) : (
          (foods.data ?? []).map((food) => {
            const active = editing?.id === food.id;
            return (
              <View key={food.id} style={[styles.foodRow, active && styles.foodRowActive]}>
                {/* Tocca un alimento per modificarlo; la "×" lo elimina. */}
                <Pressable style={{ flex: 1 }} onPress={() => startEdit(food)}>
                  <Text style={styles.foodName}>
                    {food.name}
                    {food.brand ? <Text style={styles.foodBrand}> · {food.brand}</Text> : null}
                  </Text>
                  <Text style={styles.foodMeta}>
                    {food.kcal_per_100} kcal · P {food.protein_per_100} C {food.carbs_per_100} G{" "}
                    {food.fat_per_100} /100g
                  </Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(food)} hitSlop={10} style={styles.delBtn}>
                  <Icon name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/** Riga-opzione per aggiungere un alimento: icona, titolo, spiegazione, chevron. */
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
    section: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 8,
    },

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
    formTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    fieldLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 2 },
    basisHint: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
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
    btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    disabled: { opacity: 0.5 },
    btnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },

    empty: { color: colors.textMuted, fontSize: 13 },
    foodRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    foodRowActive: { borderColor: colors.primary },
    foodName: { color: colors.text, fontSize: 15, fontWeight: "700" },
    foodBrand: { color: colors.textMuted, fontWeight: "500" },
    foodMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    delBtn: { padding: 4, marginLeft: 8 },
    error: { color: colors.fat, fontSize: 13 },
  });
