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
import { Link } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { useTheme, useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { useCreateFood, useDeleteFood, useFoodsQuery } from "../src/hooks/useFoods";
import type { CustomFoodInput } from "../src/types/food";

export default function FoodsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const foods = useFoodsQuery();
  const createFood = useCreateFood();
  const deleteFood = useDeleteFood();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [c, setC] = useState("");
  const [f, setF] = useState("");

  const nk = Number.parseFloat(kcal);
  const valid = name.trim() !== "" && Number.isFinite(nk);

  const onCreate = () => {
    if (!valid) return;
    const input: CustomFoodInput = {
      name: name.trim(),
      brand: brand.trim() || null,
      kcal_per_100: nk,
      protein_per_100: Number.parseFloat(p) || 0,
      carbs_per_100: Number.parseFloat(c) || 0,
      fat_per_100: Number.parseFloat(f) || 0,
    };
    createFood.mutate(input, {
      onSuccess: () => {
        setName("");
        setBrand("");
        setKcal("");
        setP("");
        setC("");
        setF("");
      },
    });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Foods" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.offRow}>
          <Link href="/off-search" asChild>
            <Pressable style={styles.offBtn}>
              <Text style={styles.offText}>🔎 Open Food Facts</Text>
            </Pressable>
          </Link>
          <Link href="/scan" asChild>
            <Pressable style={styles.offBtn}>
              <Text style={styles.offText}>📷 Scan</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New food (per 100g)</Text>
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
          <View style={styles.row}>
            <NumberField label="Kcal" value={kcal} onChangeText={setKcal} />
            <NumberField label="Protein" value={p} onChangeText={setP} unit="g" />
          </View>
          <View style={styles.row}>
            <NumberField label="Carbs" value={c} onChangeText={setC} unit="g" />
            <NumberField label="Fat" value={f} onChangeText={setF} unit="g" />
          </View>
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

        <Text style={styles.listTitle}>Your foods</Text>
        {foods.isLoading ? (
          <ActivityIndicator color={colors.protein} />
        ) : foods.isError ? (
          <Text style={styles.error}>Could not load. Check backend/credentials.</Text>
        ) : (foods.data ?? []).length === 0 ? (
          <Text style={styles.empty}>No foods yet.</Text>
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
              <Pressable onPress={() => deleteFood.mutate(food.id)} hitSlop={10}>
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
  offRow: { flexDirection: "row", gap: 10 },
  offBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  offText: { color: colors.water, fontSize: 14, fontWeight: "700" },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
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
  btn: { backgroundColor: colors.calories, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  disabled: { opacity: 0.5 },
  btnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },

  listTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 6 },
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
  del: { color: colors.fat, fontSize: 16, fontWeight: "700", paddingLeft: 12 },
  error: { color: colors.fat, fontSize: 13 },
});
