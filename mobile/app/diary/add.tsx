import { useEffect, useState } from "react";
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
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { Icon } from "../../src/components/Icon";
import { useTheme, useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { useI18n } from "../../src/i18n";
import { todayISO } from "../../src/lib/date";
import { useAddDiaryEntry } from "../../src/hooks/useDiary";
import { useMealsQuery } from "../../src/hooks/useMeals";
import { useFoodsQuery, useRecipesQuery } from "../../src/hooks/useFoods";
import type { AddDiaryBody } from "../../src/types/diary";
import type { CustomFood, RecipeSummary } from "../../src/types/food";

// Solo voci dal database: Alimenti o Ricette (niente più inserimento manuale).
type Mode = "custom_food" | "recipe";

export default function AddDiaryScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const router = useRouter();

  // Pasto e data arrivano dalla MealCard del Diario: il pasto è FISSO (la sezione
  // da cui ho premuto "+ Add"), non si riseleziona qui.
  const params = useLocalSearchParams<{ meal_id?: string; date?: string }>();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const add = useAddDiaryEntry(date);
  const meals = useMealsQuery();

  const paramMealId = params.meal_id ? Number(params.meal_id) : NaN;
  const [mealId, setMealId] = useState<number | null>(
    Number.isInteger(paramMealId) ? paramMealId : null,
  );
  // Fallback: se il pasto non è stato passato (o non esiste più), usa il primo.
  useEffect(() => {
    const list = meals.data ?? [];
    if (list.length > 0 && !list.some((m) => m.id === mealId)) setMealId(list[0]!.id);
  }, [meals.data, mealId]);

  const mealName = (meals.data ?? []).find((m) => m.id === mealId)?.name ?? "—";

  const MODE_OPTIONS: { value: Mode; label: string }[] = [
    { value: "custom_food", label: t("add.modeFood") },
    { value: "recipe", label: t("add.modeRecipe") },
  ];

  const [mode, setMode] = useState<Mode>("custom_food");

  // Alimento: toccarlo apre la schermata "porzione" (grammi + macro), non si
  // aggiunge da qui.
  const [search, setSearch] = useState("");
  const foods = useFoodsQuery(search);
  const openPortion = (foodId: number) =>
    router.push(`/diary/portion?food_id=${foodId}&meal_id=${mealId ?? ""}&date=${date}`);

  // Ricetta
  const recipes = useRecipesQuery();
  const [recipeId, setRecipeId] = useState<number | null>(null);

  const onAddRecipe = () => {
    if (mealId == null || recipeId == null) return;
    const body: AddDiaryBody = { date, meal_id: mealId, type: "recipe", recipe_id: recipeId };
    add.mutate(body, { onSuccess: () => router.back() });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("add.addTo", { meal: mealName })} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Scorciatoia: fotografa il pasto invece di inserirlo a mano. */}
        <Pressable
          style={styles.scanBtn}
          onPress={() => router.push(`/analyze?meal_id=${mealId ?? ""}&date=${date}`)}
        >
          <Icon name="scan" size={20} color={colors.primary} />
          <Text style={styles.scanText}>{t("add.scanMeal")}</Text>
          <Icon name="chevron" size={18} color={colors.textMuted} />
        </Pressable>

        {/* #5 — Crea un cibo nuovo (le 3 opzioni della libreria, salvabile o no). */}
        <Pressable
          style={styles.scanBtn}
          onPress={() => router.push(`/diary/new-food?meal_id=${mealId ?? ""}&date=${date}`)}
        >
          <Icon name="add" size={20} color={colors.primary} />
          <Text style={styles.scanText}>{t("newFood.button")}</Text>
          <Icon name="chevron" size={18} color={colors.textMuted} />
        </Pressable>

        <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

        {mode === "custom_food" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder={t("add.searchFood")}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            <FoodList
              loading={foods.isLoading}
              error={foods.isError}
              items={foods.data ?? []}
              onSelect={openPortion}
            />
          </>
        ) : (
          <>
            <PickList
              loading={recipes.isLoading}
              error={recipes.isError}
              items={recipes.data ?? []}
              selectedId={recipeId}
              onSelect={setRecipeId}
              render={(r: RecipeSummary) => `${r.name}  ·  ${r.totals.kcal} kcal`}
              emptyText={t("add.noRecipes")}
            />
            <Pressable
              onPress={onAddRecipe}
              disabled={add.isPending || mealId == null || recipeId == null}
              style={[
                styles.saveBtn,
                (add.isPending || mealId == null || recipeId == null) && styles.disabled,
              ]}
            >
              {add.isPending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.saveText}>{t("common.add")}</Text>
              )}
            </Pressable>
            {add.isError ? (
              <Text style={styles.error}>{t("common.genericError")}</Text>
            ) : null}
          </>
        )}
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
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />;
  if (error) return <Text style={styles.error}>{t("add.failedLoad")}</Text>;
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

/** Lista alimenti: toccare una riga apre la schermata "porzione" (grammi + macro). */
function FoodList({
  loading,
  error,
  items,
  onSelect,
}: {
  loading: boolean;
  error: boolean;
  items: CustomFood[];
  onSelect: (id: number) => void;
}) {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />;
  if (error) return <Text style={styles.error}>{t("add.failedLoad")}</Text>;
  if (items.length === 0)
    return <Text style={styles.empty}>{t("add.noFoods")}</Text>;
  return (
    <View style={{ gap: 8 }}>
      {items.map((food) => {
        // Macro mostrati per la porzione predefinita (o 100 g se non impostata).
        const serving = food.default_serving_g ?? 100;
        const f = serving / 100;
        return (
          <Pressable key={food.id} onPress={() => onSelect(food.id)} style={styles.foodRow}>
            <View style={styles.foodLeft}>
              <Text style={styles.foodName} numberOfLines={1}>
                {food.name}
              </Text>
              <Text style={styles.foodSub} numberOfLines={1}>
                {food.brand ?? `${serving} g`}
              </Text>
            </View>
            <View style={styles.foodRight}>
              <Text style={styles.foodKcal}>{Math.round(food.kcal_per_100 * f)} kcal</Text>
              <Text style={styles.foodMacros}>
                C: {Math.round(food.carbs_per_100 * f)}  P: {Math.round(food.protein_per_100 * f)}
                {"  "}G: {Math.round(food.fat_per_100 * f)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12, paddingBottom: 60 },
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
    pick: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
    pickText: { color: colors.text, fontSize: 14 },
    pickTextActive: { fontWeight: "700", color: colors.primary },
    foodRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    foodLeft: { flex: 1 },
    foodRight: { alignItems: "flex-end" },
    foodName: { color: colors.text, fontSize: 15, fontWeight: "700" },
    foodSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    foodKcal: { color: colors.text, fontSize: 15, fontWeight: "800" },
    foodMacros: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 2 },
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
