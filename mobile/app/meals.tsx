import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { Icon } from "../src/components/Icon";
import { useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { useI18n } from "../src/i18n";
import {
  useMealsQuery,
  useCreateMeal,
  useRenameMeal,
  useReorderMeals,
  useDeleteMeal,
} from "../src/hooks/useMeals";
import type { Meal } from "../src/types/meals";

/** Altezza di uno slot (riga + spazio): serve per calcolare la posizione nel drag. */
const ITEM_H = 64;

/** Profile → Meals: crea, rinomina, riordina (drag-and-drop) ed elimina i pasti. */
export default function MealsScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const meals = useMealsQuery();
  const create = useCreateMeal();
  const [newName, setNewName] = useState("");
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const onAdd = () => {
    const name = newName.trim();
    if (!name) return;
    create.mutate(name, { onSuccess: () => setNewName("") });
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("meals.title")} />
      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={scrollEnabled}
      >
        <Text style={styles.lead}>{t("meals.lead")}</Text>

        {meals.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : meals.isError ? (
          <Text style={styles.error}>{t("meals.loadError")}</Text>
        ) : (
          <DraggableMeals meals={meals.data ?? []} onDraggingChange={(d) => setScrollEnabled(!d)} />
        )}

        {/* Crea un nuovo pasto. */}
        <View style={styles.addCard}>
          <TextInput
            style={styles.input}
            placeholder={t("meals.newName")}
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

/** Lista riordinabile via drag dell'handle. Non muta l'ordine durante il drag:
 *  mostra un "buco" nello slot di destinazione e committa solo al rilascio. */
function DraggableMeals({
  meals,
  onDraggingChange,
}: {
  meals: Meal[];
  onDraggingChange: (dragging: boolean) => void;
}) {
  const { styles } = useThemed(makeStyles);
  const reorder = useReorderMeals();

  const [order, setOrder] = useState<Meal[]>(meals);
  const orderRef = useRef(order);
  orderRef.current = order;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const targetRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const translateY = useRef(new Animated.Value(0)).current;

  // Risincronizza dall'ordine del server solo quando non si sta trascinando.
  useEffect(() => {
    if (!draggingRef.current) setOrder(meals);
  }, [meals]);

  const onStart = useCallback(
    (index: number) => {
      draggingRef.current = true;
      onDraggingChange(true);
      setActiveIndex(index);
      targetRef.current = index;
      setTargetIndex(index);
      translateY.setValue(0);
    },
    [onDraggingChange, translateY],
  );

  const onMove = useCallback(
    (index: number, ty: number) => {
      translateY.setValue(ty);
      const n = orderRef.current.length;
      const t = Math.max(0, Math.min(n - 1, Math.round(index + ty / ITEM_H)));
      if (t !== targetRef.current) {
        targetRef.current = t;
        setTargetIndex(t);
      }
    },
    [translateY],
  );

  const reset = useCallback(() => {
    draggingRef.current = false;
    onDraggingChange(false);
    setActiveIndex(null);
    setTargetIndex(null);
    targetRef.current = null;
    translateY.setValue(0);
  }, [onDraggingChange, translateY]);

  const onEnd = useCallback(
    (index: number) => {
      const to = targetRef.current ?? index;
      if (to !== index) {
        const next = orderRef.current.slice();
        const [m] = next.splice(index, 1);
        next.splice(to, 0, m!);
        setOrder(next);
        reorder.mutate(next.map((x) => x.id));
      }
      reset();
    },
    [reorder, reset],
  );

  // Posizione verticale di ogni riga, con lo "scostamento" per il buco di drop.
  const topFor = (i: number): number => {
    if (activeIndex == null || i === activeIndex) return i * ITEM_H;
    const a = activeIndex;
    const t = targetIndex ?? a;
    if (a < t && i > a && i <= t) return (i - 1) * ITEM_H;
    if (a > t && i < a && i >= t) return (i + 1) * ITEM_H;
    return i * ITEM_H;
  };

  return (
    <View style={{ height: order.length * ITEM_H }}>
      {order.map((meal, i) => (
        <MealDragRow
          key={meal.id}
          meal={meal}
          index={i}
          active={i === activeIndex}
          top={topFor(i)}
          translateY={translateY}
          onStart={onStart}
          onMove={onMove}
          onEnd={onEnd}
          onCancel={() => draggingRef.current && reset()}
        />
      ))}
    </View>
  );
}

function MealDragRow({
  meal,
  index,
  active,
  top,
  translateY,
  onStart,
  onMove,
  onEnd,
  onCancel,
}: {
  meal: Meal;
  index: number;
  active: boolean;
  top: number;
  translateY: Animated.Value;
  onStart: (index: number) => void;
  onMove: (index: number, ty: number) => void;
  onEnd: (index: number) => void;
  onCancel: () => void;
}) {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const rename = useRenameMeal();
  const del = useDeleteMeal();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(meal.name);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(150)
        .onStart(() => onStart(index))
        .onUpdate((e) => onMove(index, e.translationY))
        .onEnd(() => onEnd(index))
        .onFinalize(() => onCancel()),
    [index, onStart, onMove, onEnd, onCancel],
  );

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
    Alert.alert(t("meals.deleteTitle"), t("meals.deleteMsg", { name: meal.name }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => del.mutate(meal.id) },
    ]);
  };

  return (
    <Animated.View
      style={[
        styles.dragWrap,
        { top },
        active && { transform: [{ translateY }], zIndex: 10, elevation: 6 },
      ]}
    >
      <View style={[styles.row, active && styles.rowActive]}>
        <GestureDetector gesture={pan}>
          <View style={styles.handle}>
            <Icon name="drag" size={24} color={colors.textMuted} />
          </View>
        </GestureDetector>

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

        <Pressable
          onPress={() => (editing ? saveName() : setEditing(true))}
          hitSlop={8}
          style={styles.iconBtn}
        >
          <Icon name={editing ? "check" : "settings"} size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={confirmDelete} hitSlop={8} style={styles.iconBtn}>
          <Icon name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 14, paddingBottom: 60 },
    lead: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    error: { color: colors.fat, fontSize: 13 },

    dragWrap: { position: "absolute", left: 0, right: 0, height: ITEM_H, justifyContent: "center" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
    handle: { paddingHorizontal: 6, paddingVertical: 4 },
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
