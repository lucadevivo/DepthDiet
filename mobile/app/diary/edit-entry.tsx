import { useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { NumberField } from "../../src/components/NumberField";
import { MacroDonut } from "../../src/components/MacroDonut";
import { Icon } from "../../src/components/Icon";
import { useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { todayISO } from "../../src/lib/date";
import { useUpdateDiaryEntry } from "../../src/hooks/useDiary";
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
 * Modifica la grammatura di una voce già nel diario. I valori correnti arrivano
 * dai parametri (niente fetch): l'anteprima dei macro scala in proporzione ai
 * grammi e il salvataggio ricalcola lato server.
 */
export default function EditEntryScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    grams?: string;
    kcal?: string;
    protein_g?: string;
    carbs_g?: string;
    fat_g?: string;
    food_id?: string;
    name?: string;
  }>();

  const id = params.id ? Number(params.id) : null;
  const foodId = params.food_id ? Number(params.food_id) : null;
  const date =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const baseGrams = Number.parseFloat(params.grams ?? "");
  const base = {
    kcal: Number.parseFloat(params.kcal ?? "0") || 0,
    protein: Number.parseFloat(params.protein_g ?? "0") || 0,
    carbs: Number.parseFloat(params.carbs_g ?? "0") || 0,
    fat: Number.parseFloat(params.fat_g ?? "0") || 0,
  };
  const name = params.name ?? "Entry";

  const update = useUpdateDiaryEntry(date);
  // Solo le voci collegate a un Alimento Personale hanno una porzione predefinita.
  const foodQ = useFoodQuery(foodId);
  const food = foodQ.data;
  const updateFood = useUpdateFood();

  const [grams, setGrams] = useState(
    Number.isFinite(baseGrams) ? String(Math.round(baseGrams)) : "",
  );

  const g = Number.parseFloat(grams);
  const validGrams = Number.isFinite(g) && g > 0;
  const factor = validGrams && Number.isFinite(baseGrams) && baseGrams > 0 ? g / baseGrams : 0;

  const macros = {
    kcal: base.kcal * factor,
    protein: base.protein * factor,
    carbs: base.carbs * factor,
    fat: base.fat * factor,
  };

  const isDefault =
    food != null && validGrams && Math.abs((food.default_serving_g ?? -1) - g) < 0.001;

  const onSave = () => {
    if (id == null || !validGrams) return;
    update.mutate({ id, grams: g }, { onSuccess: () => router.back() });
  };

  const onSetDefault = () => {
    if (food == null || !validGrams) return;
    updateFood.mutate({ id: food.id, input: toInput(food, g) });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={name} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>Adjust the amount — the macros update with it.</Text>

        <View style={styles.card}>
          <MacroDonut protein_g={macros.protein} carbs_g={macros.carbs} fat_g={macros.fat} />
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Calories</Text>
            <Text style={styles.rowValue}>{Math.round(macros.kcal)} kcal</Text>
          </View>
          <View style={styles.sep} />
          <MacroRow label="Protein" value={macros.protein} color={colors.protein} styles={styles} />
          <MacroRow label="Carbs" value={macros.carbs} color={colors.carbs} styles={styles} />
          <MacroRow label="Fat" value={macros.fat} color={colors.fat} styles={styles} />
        </View>

        <NumberField label="Grams" value={grams} onChangeText={setGrams} unit="g" />

        {/* Solo per le voci collegate a un Alimento: salva questa grammatura come
            porzione predefinita del cibo (come nel flusso "+ Add"). */}
        {food != null ? (
          <Pressable
            onPress={onSetDefault}
            disabled={!validGrams || updateFood.isPending || isDefault}
            style={[styles.defaultBtn, (!validGrams || isDefault) && styles.disabled]}
          >
            <Icon name={isDefault ? "check" : "weight"} size={18} color={colors.primary} />
            <Text style={styles.defaultText}>
              {isDefault
                ? `Default portion: ${Math.round(g)} g`
                : `Set ${validGrams ? Math.round(g) : "—"} g as default portion`}
            </Text>
            {updateFood.isPending ? <ActivityIndicator color={colors.primary} /> : null}
          </Pressable>
        ) : null}

        <Pressable
          onPress={onSave}
          disabled={update.isPending || !validGrams || id == null}
          style={[styles.saveBtn, (update.isPending || !validGrams || id == null) && styles.disabled]}
        >
          {update.isPending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveText}>Save changes</Text>
          )}
        </Pressable>
        {update.isError ? <Text style={styles.error}>Something went wrong. Try again.</Text> : null}
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
    lead: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
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
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 4,
    },
    saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
    disabled: { opacity: 0.5 },
    error: { color: colors.fat, fontSize: 13 },
  });
