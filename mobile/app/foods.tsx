import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { Icon, type IconName } from "../src/components/Icon";
import { useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { useCreateFood, useDeleteFood, useFoodsQuery } from "../src/hooks/useFoods";
import type { CustomFoodInput } from "../src/types/food";

type Basis = "per100" | "portion";
const BASIS_OPTIONS: { value: Basis; label: string }[] = [
  { value: "per100", label: "Per 100 g" },
  { value: "portion", label: "Per portion" },
];

export default function FoodsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const router = useRouter();
  const foods = useFoodsQuery();
  const createFood = useCreateFood();
  const deleteFood = useDeleteFood();

  const [showManual, setShowManual] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");
  // Base dei valori inseriti: per 100 g (standard) oppure per una porzione scelta.
  const [basis, setBasis] = useState<Basis>("per100");
  const [portionG, setPortionG] = useState("");

  const nk = Number.parseFloat(kcal);
  const pg = Number.parseFloat(portionG);
  const portionValid = basis === "per100" || (Number.isFinite(pg) && pg > 0);
  const valid = name.trim() !== "" && Number.isFinite(nk) && portionValid;

  const resetForm = () => {
    setName("");
    setBrand("");
    setKcal("");
    setP("");
    setC("");
    setF("");
    setBasis("per100");
    setPortionG("");
    setShowManual(false);
  };

  const onCreate = () => {
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
      protein_per_100: Math.round((Number.parseFloat(p) || 0) * factor * 10) / 10,
      carbs_per_100: Math.round((Number.parseFloat(c) || 0) * factor * 10) / 10,
      fat_per_100: Math.round((Number.parseFloat(f) || 0) * factor * 10) / 10,
      default_serving_g: basis === "portion" ? pg : null,
    };
    createFood.mutate(input, { onSuccess: resetForm });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Foods" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Your personal food library. Add the foods you eat so you can log them in seconds and the
          meal scanner can match them automatically.
        </Text>

        <Text style={styles.section}>Add a food</Text>

        {/* 3 modi per aggiungere un alimento, ognuno spiegato. */}
        <OptionRow
          icon="search"
          title="Search the food database"
          subtitle="Open Food Facts: a free, community-run database of packaged foods from around the world. Find a product and import its nutrition."
          onPress={() => router.push("/off-search")}
        />
        <OptionRow
          icon="barcode"
          title="Scan a barcode"
          subtitle="Point the camera at a product's barcode to look it up and import it."
          onPress={() => router.push("/scan")}
        />
        <OptionRow
          icon="add"
          title="Enter manually"
          subtitle="Type the name and the macros — per 100 g or for a portion you choose."
          onPress={() => setShowManual((s) => !s)}
          open={showManual}
        />

        {showManual ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New food</Text>
            <TextInput
              style={styles.input}
              placeholder="Name (e.g. Oats)"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Brand (optional)"
              placeholderTextColor={colors.textMuted}
              value={brand}
              onChangeText={setBrand}
            />

            {/* Base dei valori: standard (100 g) o una porzione decisa dall'utente. */}
            <Text style={styles.fieldLabel}>Values are for</Text>
            <SegmentedControl options={BASIS_OPTIONS} value={basis} onChange={setBasis} />
            {basis === "portion" ? (
              <NumberField
                label="Portion size"
                value={portionG}
                onChangeText={setPortionG}
                unit="g"
                placeholder="e.g. 55"
              />
            ) : null}

            <View style={styles.row}>
              <NumberField label="Kcal" value={kcal} onChangeText={setKcal} />
              <NumberField label="Protein" value={p} onChangeText={setP} unit="g" />
            </View>
            <View style={styles.row}>
              <NumberField label="Carbs" value={c} onChangeText={setC} unit="g" />
              <NumberField label="Fat" value={f} onChangeText={setF} unit="g" />
            </View>
            <Text style={styles.basisHint}>
              {basis === "portion"
                ? "Enter the macros for one portion of the size above; it's saved as the default portion."
                : "Enter the macros per 100 g."}
            </Text>
            <Pressable
              onPress={onCreate}
              disabled={!valid || createFood.isPending}
              style={[styles.btn, (!valid || createFood.isPending) && styles.disabled]}
            >
              {createFood.isPending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.btnText}>Save food</Text>
              )}
            </Pressable>
            {createFood.isError ? <Text style={styles.error}>Could not save.</Text> : null}
          </View>
        ) : null}

        <Text style={styles.section}>Your foods</Text>
        {foods.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : foods.isError ? (
          <Text style={styles.error}>Could not load. Check backend/credentials.</Text>
        ) : (foods.data ?? []).length === 0 ? (
          <Text style={styles.empty}>No foods yet. Add your first one above.</Text>
        ) : (
          (foods.data ?? []).map((food) => (
            <View key={food.id} style={styles.foodRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>
                  {food.name}
                  {food.brand ? <Text style={styles.foodBrand}> · {food.brand}</Text> : null}
                </Text>
                <Text style={styles.foodMeta}>
                  {food.kcal_per_100} kcal · P {food.protein_per_100} C {food.carbs_per_100} G{" "}
                  {food.fat_per_100} /100g
                </Text>
              </View>
              <Pressable onPress={() => deleteFood.mutate(food.id)} hitSlop={10} style={styles.delBtn}>
                <Icon name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))
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
    foodName: { color: colors.text, fontSize: 15, fontWeight: "700" },
    foodBrand: { color: colors.textMuted, fontWeight: "500" },
    foodMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    delBtn: { padding: 4, marginLeft: 8 },
    error: { color: colors.fat, fontSize: 13 },
  });
