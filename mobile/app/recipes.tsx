import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { Icon } from "../src/components/Icon";
import { useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { useI18n } from "../src/i18n";
import {
  useCreateRecipe,
  useDeleteRecipe,
  useFoodsQuery,
  useRecipesQuery,
} from "../src/hooks/useFoods";
import type { CustomFood } from "../src/types/food";

interface DraftItem {
  food_id: number;
  grams: number;
  name: string;
}

export default function RecipesScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const recipes = useRecipesQuery();
  const foods = useFoodsQuery();
  const createRecipe = useCreateRecipe();
  const deleteRecipe = useDeleteRecipe();

  const [name, setName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  // Food in fase di aggiunta: si sceglie la grammatura nel modale, come nel diario.
  const [picking, setPicking] = useState<CustomFood | null>(null);
  const [modalGrams, setModalGrams] = useState("");

  const openGrams = (food: CustomFood) => {
    setPicking(food);
    setModalGrams(String(food.default_serving_g ?? 100));
  };

  const confirmGrams = () => {
    const g = Number.parseFloat(modalGrams);
    if (!picking || !Number.isFinite(g) || g <= 0) return;
    setItems((prev) => [...prev, { food_id: picking.id, grams: g, name: picking.name }]);
    setPicking(null);
    setModalGrams("");
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
      <ScreenHeader title={t("recipes.title")} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("recipes.new")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("recipes.namePlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.sub}>{t("recipes.ingredients")}</Text>
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

          <Text style={styles.sub}>{t("recipes.addIngredient")}</Text>
          <Text style={styles.hint}>{t("recipes.tapFood")}</Text>
          {foods.isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (foods.data ?? []).length === 0 ? (
            <Text style={styles.empty}>{t("recipes.createFoodsFirst")}</Text>
          ) : (
            <View style={{ gap: 6 }}>
              {(foods.data ?? []).map((food) => (
                <Pressable key={food.id} onPress={() => openGrams(food)} style={styles.pick}>
                  <Text style={styles.pickText}>{food.name}</Text>
                  <Icon name="add" size={18} color={colors.primary} />
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            onPress={onSave}
            disabled={!canSave || createRecipe.isPending}
            style={[styles.btn, (!canSave || createRecipe.isPending) && styles.disabled]}
          >
            {createRecipe.isPending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.btnText}>{t("recipes.save")}</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.listTitle}>{t("recipes.yours")}</Text>
        {recipes.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : recipes.isError ? (
          <Text style={styles.error}>{t("common.couldNotLoad")}</Text>
        ) : (recipes.data ?? []).length === 0 ? (
          <Text style={styles.empty}>{t("recipes.none")}</Text>
        ) : (
          (recipes.data ?? []).map((r) => (
            <View key={r.id} style={styles.recipeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recipeName}>{r.name}</Text>
                <Text style={styles.recipeMeta}>
                  {t("recipes.itemsMeta", { count: r.itemCount, kcal: r.totals.kcal, protein: r.totals.protein_g })}
                </Text>
              </View>
              <Pressable onPress={() => deleteRecipe.mutate(r.id)} hitSlop={10}>
                <Text style={styles.del}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modale grammatura ingrediente. */}
      <Modal
        visible={picking != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicking(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPicking(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{picking?.name}</Text>
            <NumberField label={t("common.grams")} value={modalGrams} onChangeText={setModalGrams} unit="g" />
            <Pressable
              onPress={confirmGrams}
              style={[styles.btn, { marginTop: 0 }]}
            >
              <Text style={styles.btnText}>{t("recipes.addIngredient")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  hint: { color: colors.textMuted, fontSize: 12, marginTop: -4 },
  pick: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
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
