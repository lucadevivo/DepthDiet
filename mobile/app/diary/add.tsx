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
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { NumberField } from "../../src/components/NumberField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { MealPicker } from "../../src/components/MealPicker";
import { Icon } from "../../src/components/Icon";
import { colors } from "../../src/theme/colors";
import { todayISO } from "../../src/lib/date";
import { useAddDiaryEntry } from "../../src/hooks/useDiary";
import { useMealsQuery } from "../../src/hooks/useMeals";
import { useFoodsQuery, useRecipesQuery } from "../../src/hooks/useFoods";
import type { AddDiaryBody } from "../../src/types/diary";
import type { CustomFood, RecipeSummary } from "../../src/types/food";

type Mode = "custom_food" | "recipe" | "manual";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "custom_food", label: "Food" },
  { value: "recipe", label: "Recipe" },
  { value: "manual", label: "Manual" },
];

export default function AddDiaryScreen() {
  const router = useRouter();

  // Pasto e data preselezionati dalla MealCard del Diario (la data fa sì che la
  // voce finisca sul giorno che stai guardando, non sempre su oggi).
  const params = useLocalSearchParams<{ meal_id?: string; date?: string }>();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const add = useAddDiaryEntry(date);
  const meals = useMealsQuery();

  const paramMealId = params.meal_id ? Number(params.meal_id) : NaN;
  const [mealId, setMealId] = useState<number | null>(
    Number.isInteger(paramMealId) ? paramMealId : null,
  );
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
    if (mealId == null) return;
    let body: AddDiaryBody | null = null;
    if (mode === "custom_food") {
      const g = Number.parseFloat(grams);
      if (foodId == null || !Number.isFinite(g) || g <= 0) return;
      body = { date, meal_id: mealId, type: "custom_food", food_id: foodId, grams: g };
    } else if (mode === "recipe") {
      if (recipeId == null) return;
      body = { date, meal_id: mealId, type: "recipe", recipe_id: recipeId };
    } else {
      const nk = Number.parseFloat(kcal);
      if (!desc.trim() || !Number.isFinite(nk)) return;
      body = {
        date,
        meal_id: mealId,
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
      <ScreenHeader title="Add to diary" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Scorciatoia: fotografa il pasto invece di inserirlo a mano. */}
        <Pressable
          style={styles.scanBtn}
          onPress={() =>
            router.push(`/analyze?meal_id=${mealId ?? ""}&date=${date}`)
          }
        >
          <Icon name="scan" size={20} color={colors.primary} />
          <Text style={styles.scanText}>Scan a meal with the camera</Text>
          <Icon name="chevron" size={18} color={colors.textMuted} />
        </Pressable>

        <Label text="Meal" />
        <MealPicker
          meals={meals.data ?? []}
          loading={meals.isLoading}
          value={mealId}
          onChange={setMealId}
        />

        <Label text="Type" />
        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

        {mode === "custom_food" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Search a food..."
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
              emptyText="No foods yet. Create one from the Foods screen."
            />
            <NumberField label="Grams" value={grams} onChangeText={setGrams} unit="g" />
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
            emptyText="No recipes yet. Create one from the Recipes screen."
          />
        ) : null}

        {mode === "manual" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Description (e.g. Apple)"
              placeholderTextColor={colors.textMuted}
              value={desc}
              onChangeText={setDesc}
            />
            <View style={styles.row}>
              <NumberField label="Kcal" value={kcal} onChangeText={setKcal} />
              <NumberField label="Protein" value={p} onChangeText={setP} unit="g" />
            </View>
            <View style={styles.row}>
              <NumberField label="Carbs" value={c} onChangeText={setC} unit="g" />
              <NumberField label="Fat" value={f} onChangeText={setF} unit="g" />
            </View>
          </>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={add.isPending || mealId == null}
          style={[styles.saveBtn, (add.isPending || mealId == null) && styles.disabled]}
        >
          {add.isPending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveText}>Add</Text>
          )}
        </Pressable>
        {add.isError ? <Text style={styles.error}>Something went wrong. Try again.</Text> : null}
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
  if (error) return <Text style={styles.error}>Failed to load.</Text>;
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
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
  error: { color: colors.fat, fontSize: 13 },

  scanBtn: {
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
  scanText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "700" },
});
