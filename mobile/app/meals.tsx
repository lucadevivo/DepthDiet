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
import { ScreenHeader } from "../src/components/ScreenHeader";
import { Icon } from "../src/components/Icon";
import { useTheme, useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import {
  useMealsQuery,
  useCreateMeal,
  useRenameMeal,
  useReorderMeals,
  useDeleteMeal,
} from "../src/hooks/useMeals";
import type { Meal } from "../src/types/meals";

/** Profile → Meals: crea, rinomina, riordina ed elimina i pasti (F3). */
export default function MealsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const meals = useMealsQuery();
  const create = useCreateMeal();
  const reorder = useReorderMeals();
  const [newName, setNewName] = useState("");

  const list = meals.data ?? [];

  const onAdd = () => {
    const name = newName.trim();
    if (!name) return;
    create.mutate(name, { onSuccess: () => setNewName("") });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= list.length) return;
    const ids = list.map((m) => m.id);
    [ids[index], ids[next]] = [ids[next]!, ids[index]!];
    reorder.mutate(ids);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Meals" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Your meals organize the diary. Reorder, rename or delete them — deleting a meal keeps its
          past entries under "Other".
        </Text>

        {meals.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : meals.isError ? (
          <Text style={styles.error}>Could not load meals. Check connection/credentials.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {list.map((meal, i) => (
              <MealRow
                key={meal.id}
                meal={meal}
                isFirst={i === 0}
                isLast={i === list.length - 1}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
              />
            ))}
          </View>
        )}

        {/* Crea un nuovo pasto. */}
        <View style={styles.addCard}>
          <TextInput
            style={styles.input}
            placeholder="New meal name"
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={setNewName}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={onAdd}
          />
          <Pressable
            onPress={onAdd}
            disabled={create.isPending || newName.trim() === ""}
            style={[styles.addBtn, (create.isPending || newName.trim() === "") && styles.disabled]}
          >
            {create.isPending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Icon name="add" size={22} color={colors.onPrimary} />
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function MealRow({
  meal,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  meal: Meal;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { colors, styles } = useThemed(makeStyles);
  const rename = useRenameMeal();
  const del = useDeleteMeal();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(meal.name);

  const saveName = () => {
    const n = name.trim();
    if (!n || n === meal.name) {
      setEditing(false);
      setName(meal.name);
      return;
    }
    rename.mutate({ id: meal.id, name: n }, { onSuccess: () => setEditing(false) });
  };

  const confirmDelete = () => {
    Alert.alert("Delete meal", `Delete "${meal.name}"? Past entries will move to "Other".`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate(meal.id) },
    ]);
  };

  return (
    <View style={styles.row}>
      <View style={styles.reorder}>
        <Pressable onPress={onMoveUp} disabled={isFirst} hitSlop={6}>
          <Icon name="back" size={18} color={isFirst ? colors.border : colors.textMuted} />
        </Pressable>
        <Pressable onPress={onMoveDown} disabled={isLast} hitSlop={6}>
          <Icon name="forward" size={18} color={isLast ? colors.border : colors.textMuted} />
        </Pressable>
      </View>

      {editing ? (
        <TextInput
          style={styles.editInput}
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={40}
          onSubmitEditing={saveName}
          onBlur={saveName}
          returnKeyType="done"
        />
      ) : (
        <Pressable style={{ flex: 1 }} onPress={() => setEditing(true)}>
          <Text style={styles.name}>{meal.name}</Text>
        </Pressable>
      )}

      <Pressable onPress={() => (editing ? saveName() : setEditing(true))} hitSlop={8} style={styles.iconBtn}>
        <Icon name={editing ? "check" : "settings"} size={18} color={colors.textMuted} />
      </Pressable>
      <Pressable onPress={confirmDelete} hitSlop={8} style={styles.iconBtn}>
        <Icon name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 60 },
  lead: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.fat, fontSize: 13 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reorder: { gap: 2, alignItems: "center" },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  editInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  iconBtn: { padding: 4 },

  addCard: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 6 },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
});
