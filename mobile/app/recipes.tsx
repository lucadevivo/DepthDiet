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
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { useTheme, useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import {
  useCreateRecipe,
  useDeleteRecipe,
  useFoodsQuery,
  useRecipesQuery,
} from "../src/hooks/useFoods";

interface DraftItem {
  food_id: number;
  grams: number;
  name: string;
}

export default function RecipesScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const recipes = useRecipesQuery();
  const foods = useFoodsQuery();
  const createRecipe = useCreateRecipe();
  const deleteRecipe = useDeleteRecipe();

  const [name, setName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [pickedFood, setPickedFood] = useState<number | null>(null);
  const [grams, setGrams] = useState("");

  const addItem = () => {
    const g = Number.parseFloat(grams);
    const food = (foods.data ?? []).find((x) => x.id === pickedFood);
    if (!food || !Number.isFinite(g) || g <= 0) return;
    setItems((prev) => [...prev, { food_id: food.id, grams: g, name: food.name }]);
    setPickedFood(null);
    setGrams("");
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const canSave = name.trim() !== "" && items.length > 0;
  const onSave = () => {
    if (!canSave) return;
    createRecipe.mutate(
      { name: name.trim(), items: items.map((i) => ({ food_id: i.food_id, grams: i.grams })) },
      {
        onSuccess: () => {
          setName("");
          setItems([]);
        },
      },
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Recipes" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New recipe</Text>
          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Chicken and rice)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.sub}>Ingredients</Text>
          {items.map((it, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemText}>
                {it.name} · {it.grams} g
              </Text>
              <Pressable onPress={() => removeItem(idx)} hitSlop={10}>
                <Text style={styles.del}>✕</Text>
              </Pressable>
            </View>
          ))}

          <Text style={styles.sub}>Add ingredient</Text>
          {foods.isLoading ? (
            <ActivityIndicator color={colors.protein} />
          ) : (foods.data ?? []).length === 0 ? (
            <Text style={styles.empty}>Create some foods first.</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {(foods.data ?? []).map((food) => {
                const active = food.id === pickedFood;
                return (
                  <Pressable
                    key={food.id}
                    onPress={() => setPickedFood(food.id)}
                    style={[styles.pick, active && styles.pickActive]}
                  >
                    <Text style={[styles.pickText, active && styles.pickTextActive]}>
                      {food.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={styles.addRow}>
            <NumberField label="Grams" value={grams} onChangeText={setGrams} unit="g" />
            <Pressable
              onPress={addItem}
              disabled={pickedFood == null}
              style={[styles.addBtn, pickedFood == null && styles.disabled]}
            >
              <Text style={styles.addText}>+ Item</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onSave}
            disabled={!canSave || createRecipe.isPending}
            style={[styles.btn, (!canSave || createRecipe.isPending) && styles.disabled]}
          >
            {createRecipe.isPending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.btnText}>Save recipe</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.listTitle}>Your recipes</Text>
        {recipes.isLoading ? (
          <ActivityIndicator color={colors.protein} />
        ) : recipes.isError ? (
          <Text style={styles.error}>Could not load.</Text>
        ) : (recipes.data ?? []).length === 0 ? (
          <Text style={styles.empty}>No recipes yet.</Text>
        ) : (
          (recipes.data ?? []).map((r) => (
            <View key={r.id} style={styles.recipeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recipeName}>{r.name}</Text>
                <Text style={styles.recipeMeta}>
                  {r.itemCount} items · {r.totals.kcal} kcal · P {r.totals.protein_g}g
                </Text>
              </View>
              <Pressable onPress={() => deleteRecipe.mutate(r.id)} hitSlop={10}>
                <Text style={styles.del}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 60 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 13, fontWeight: "700", marginTop: 4 },
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
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemText: { color: colors.text, fontSize: 14 },
  pick: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickActive: { borderColor: colors.protein },
  pickText: { color: colors.text, fontSize: 14 },
  pickTextActive: { color: colors.protein, fontWeight: "700" },
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  addBtn: {
    backgroundColor: colors.protein,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  addText: { color: "#fff", fontWeight: "800" },
  btn: { backgroundColor: colors.calories, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  disabled: { opacity: 0.4 },
  btnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },
  listTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 6 },
  empty: { color: colors.textMuted, fontSize: 13 },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipeName: { color: colors.text, fontSize: 15, fontWeight: "700" },
  recipeMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  del: { color: colors.fat, fontSize: 16, fontWeight: "700", paddingLeft: 12 },
  error: { color: colors.fat, fontSize: 13 },
});
