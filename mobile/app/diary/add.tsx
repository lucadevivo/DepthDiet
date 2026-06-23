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
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { NumberField } from "../../src/components/NumberField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { colors } from "../../src/theme/colors";
import { todayISO } from "../../src/lib/date";
import { useAddDiaryEntry } from "../../src/hooks/useDiary";
import { useFoodsQuery, useRecipesQuery } from "../../src/hooks/useFoods";
import { MEAL_LABELS, type MealName } from "../../src/types/nutrition";
import type { AddDiaryBody } from "../../src/types/diary";
import type { CustomFood, RecipeSummary } from "../../src/types/food";

type Mode = "custom_food" | "recipe" | "manual";

const MEAL_OPTIONS = (Object.keys(MEAL_LABELS) as MealName[]).map((m) => ({
  value: m,
  label: MEAL_LABELS[m],
}));
const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "custom_food", label: "Alimento" },
  { value: "recipe", label: "Ricetta" },
  { value: "manual", label: "Manuale" },
];

export default function AddDiaryScreen() {
  const router = useRouter();
  const date = todayISO();
  const add = useAddDiaryEntry(date);

  const [meal, setMeal] = useState<MealName>("lunch");
  const [mode, setMode] = useState<Mode>("custom_food");

  // Alimento
  const [search, setSearch] = useState("");
  const foods = useFoodsQuery(search);
  const [foodId, setFoodId] = useState<number | null>(null);
  const [grams, setGrams] = useState("");

  // Ricetta
  const recipes = useRecipesQuery();
  const [recipeId, setRecipeId] = useState<number | null>(null);

  // Manuale
  const [desc, setDesc] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");

  const onSubmit = () => {
    let body: AddDiaryBody | null = null;
    if (mode === "custom_food") {
      const g = Number.parseFloat(grams);
      if (foodId == null || !Number.isFinite(g) || g <= 0) return;
      body = { date, meal, type: "custom_food", food_id: foodId, grams: g };
    } else if (mode === "recipe") {
      if (recipeId == null) return;
      body = { date, meal, type: "recipe", recipe_id: recipeId };
    } else {
      const nk = Number.parseFloat(kcal);
      if (!desc.trim() || !Number.isFinite(nk)) return;
      body = {
        date,
        meal,
        type: "manual",
        description: desc.trim(),
        kcal: nk,
        protein_g: Number.parseFloat(p) || 0,
        carbs_g: Number.parseFloat(c) || 0,
        fat_g: Number.parseFloat(f) || 0,
      };
    }
    add.mutate(body, { onSuccess: () => router.back() });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Aggiungi al diario" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Label text="Pasto" />
        <SegmentedControl options={MEAL_OPTIONS} value={meal} onChange={setMeal} />

        <Label text="Tipo" />
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

        {mode === "custom_food" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Cerca un alimento..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            <PickList
              loading={foods.isLoading}
              error={foods.isError}
              items={foods.data ?? []}
              selectedId={foodId}
              onSelect={setFoodId}
              render={(food: CustomFood) => `${food.name}  ·  ${food.kcal_per_100} kcal/100g`}
              emptyText="Nessun alimento. Creane uno dalla schermata Alimenti."
            />
            <NumberField label="Grammi" value={grams} onChangeText={setGrams} unit="g" />
          </>
        ) : null}

        {mode === "recipe" ? (
          <PickList
            loading={recipes.isLoading}
            error={recipes.isError}
            items={recipes.data ?? []}
            selectedId={recipeId}
            onSelect={setRecipeId}
            render={(r: RecipeSummary) => `${r.name}  ·  ${r.totals.kcal} kcal`}
            emptyText="Nessuna ricetta. Creane una dalla schermata Ricette."
          />
        ) : null}

        {mode === "manual" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Descrizione (es. Mela)"
              placeholderTextColor={colors.textMuted}
              value={desc}
              onChangeText={setDesc}
            />
            <View style={styles.row}>
              <NumberField label="Kcal" value={kcal} onChangeText={setKcal} />
              <NumberField label="Proteine" value={p} onChangeText={setP} unit="g" />
            </View>
            <View style={styles.row}>
              <NumberField label="Carbo" value={c} onChangeText={setC} unit="g" />
              <NumberField label="Grassi" value={f} onChangeText={setF} unit="g" />
            </View>
          </>
        ) : null}

        <Pressable onPress={onSubmit} disabled={add.isPending} style={[styles.saveBtn, add.isPending && styles.disabled]}>
          {add.isPending ? (
            <ActivityIndicator color="#06210f" />
          ) : (
            <Text style={styles.saveText}>Aggiungi</Text>
          )}
        </Pressable>
        {add.isError ? <Text style={styles.error}>Errore. Riprova.</Text> : null}
      </ScrollView>
    </View>
  );
}

interface PickListProps<T extends { id: number }> {
  loading: boolean;
  error: boolean;
  items: T[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  render: (item: T) => string;
  emptyText: string;
}
function PickList<T extends { id: number }>({
  loading,
  error,
  items,
  selectedId,
  onSelect,
  render,
  emptyText,
}: PickListProps<T>) {
  if (loading) return <ActivityIndicator color={colors.protein} style={{ marginVertical: 12 }} />;
  if (error) return <Text style={styles.error}>Errore di caricamento.</Text>;
  if (items.length === 0) return <Text style={styles.empty}>{emptyText}</Text>;
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.pick, active && styles.pickActive]}
          >
            <Text style={[styles.pickText, active && styles.pickTextActive]}>{render(item)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 60 },
  label: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 6 },
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
  pick: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickActive: { borderColor: colors.protein, backgroundColor: colors.surfaceAlt },
  pickText: { color: colors.text, fontSize: 14 },
  pickTextActive: { fontWeight: "700", color: colors.protein },
  empty: { color: colors.textMuted, fontSize: 13 },
  saveBtn: {
    backgroundColor: colors.calories,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  saveText: { color: "#06210f", fontSize: 16, fontWeight: "800" },
  error: { color: colors.fat, fontSize: 13 },
});
