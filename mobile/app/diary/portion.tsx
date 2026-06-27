import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { NumberField } from "../../src/components/NumberField";
import { MacroDonut } from "../../src/components/MacroDonut";
import { Icon } from "../../src/components/Icon";
import { useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { useI18n } from "../../src/i18n";
import { todayISO } from "../../src/lib/date";
import { useAddDiaryEntry } from "../../src/hooks/useDiary";
import { useFoodQuery, useUpdateFood } from "../../src/hooks/useFoods";
import type { CustomFood, CustomFoodInput } from "../../src/types/food";

/** CustomFood -> input completo per la PUT (il backend richiede nome + macro). */
function toInput(food: CustomFood, default_serving_g: number | null): CustomFoodInput {
  return {
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    kcal_per_100: food.kcal_per_100,
    protein_per_100: food.protein_per_100,
    carbs_per_100: food.carbs_per_100,
    fat_per_100: food.fat_per_100,
    default_serving_g,
  };
}

/**
 * Schermata "porzione": scelta dei grammi per un Alimento, con distribuzione macro
 * (testo + ciambella) ricalcolata in tempo reale. Si arriva qui toccando un cibo
 * nella libreria dal flusso "+ Add". Permette anche di salvare la grammatura
 * corrente come quantità predefinita dell'alimento (es. uovo = 55 g).
 */
export default function PortionScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const router = useRouter();

  const params = useLocalSearchParams<{ food_id?: string; meal_id?: string; date?: string }>();
  const foodId = params.food_id ? Number(params.food_id) : null;
  const mealId = params.meal_id ? Number(params.meal_id) : null;
  const date =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();

  const foodQ = useFoodQuery(foodId);
  const food = foodQ.data;

  const add = useAddDiaryEntry(date);
  const update = useUpdateFood();

  // Grammi: prima del caricamento è vuoto; appena arriva il cibo si precompila
  // con la porzione predefinita (o 100 g). Si ripopola se cambia alimento.
  const [grams, setGrams] = useState("");
  useEffect(() => {
    if (food) setGrams(String(food.default_serving_g ?? 100));
  }, [food?.id]);

  const g = Number.parseFloat(grams);
  const validGrams = Number.isFinite(g) && g > 0;
  const factor = validGrams ? g / 100 : 0;

  const macros = food
    ? {
        kcal: food.kcal_per_100 * factor,
        protein: food.protein_per_100 * factor,
        carbs: food.carbs_per_100 * factor,
        fat: food.fat_per_100 * factor,
      }
    : { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const isDefault =
    food != null && validGrams && Math.abs((food.default_serving_g ?? -1) - g) < 0.001;

  const onAdd = () => {
    if (foodId == null || mealId == null || !validGrams) return;
    add.mutate(
      { date, meal_id: mealId, type: "custom_food", food_id: foodId, grams: g },
      { onSuccess: () => router.dismissAll() },
    );
  };

  const onSetDefault = () => {
    if (food == null || !validGrams) return;
    update.mutate({ id: food.id, input: toInput(food, g) });
  };

  if (foodQ.isLoading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t("portion.title")} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }
  if (foodQ.isError || !food) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t("portion.title")} />
        <Text style={[styles.error, { padding: 16 }]}>{t("portion.loadError")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={food.name} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {food.brand ? <Text style={styles.brand}>{food.brand}</Text> : null}

        {/* Distribuzione macro a ciambella per la grammatura scelta. */}
        <View style={styles.card}>
          <MacroDonut protein_g={macros.protein} carbs_g={macros.carbs} fat_g={macros.fat} />
        </View>

        {/* Distribuzione macro in forma testuale. */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t("common.calories")}</Text>
            <Text style={styles.rowValue}>{Math.round(macros.kcal)} kcal</Text>
          </View>
          <View style={styles.sep} />
          <MacroRow label={t("common.protein")} value={macros.protein} color={colors.protein} styles={styles} />
          <MacroRow label={t("common.carbs")} value={macros.carbs} color={colors.carbs} styles={styles} />
          <MacroRow label={t("common.fat")} value={macros.fat} color={colors.fat} styles={styles} />
        </View>

        <NumberField label={t("common.grams")} value={grams} onChangeText={setGrams} unit="g" />

        {/* Salva la grammatura corrente come porzione predefinita di questo cibo. */}
        <Pressable
          onPress={onSetDefault}
          disabled={!validGrams || update.isPending || isDefault}
          style={[styles.defaultBtn, (!validGrams || isDefault) && styles.disabled]}
        >
          <Icon name={isDefault ? "check" : "weight"} size={18} color={colors.primary} />
          <Text style={styles.defaultText}>
            {isDefault
              ? t("portion.defaultIs", { g: Math.round(g) })
              : t("portion.setDefault", { g: validGrams ? Math.round(g) : "—" })}
          </Text>
          {update.isPending ? <ActivityIndicator color={colors.primary} /> : null}
        </Pressable>

        <Pressable
          onPress={onAdd}
          disabled={add.isPending || !validGrams || mealId == null}
          style={[styles.saveBtn, (add.isPending || !validGrams || mealId == null) && styles.disabled]}
        >
          {add.isPending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveText}>{t("common.add")}</Text>
          )}
        </Pressable>
        {add.isError ? <Text style={styles.error}>{t("common.genericError")}</Text> : null}
      </ScrollView>
    </View>
  );
}

function MacroRow({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: number;
  color: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelWrap}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{Math.round(value)} g</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 14, paddingBottom: 60 },
    brand: { color: colors.textMuted, fontSize: 14, marginTop: -4 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    rowLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    rowLabel: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
    rowValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
    sep: { height: 1, backgroundColor: colors.border },
    defaultBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    defaultText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
    disabled: { opacity: 0.5 },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 4,
    },
    saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
    error: { color: colors.fat, fontSize: 13 },
  });
