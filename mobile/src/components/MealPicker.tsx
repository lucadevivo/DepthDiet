import { useEffect } from "react";
import { ScrollView, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import type { Meal } from "../types/meals";

interface Props {
  meals: Meal[];
  loading: boolean;
  value: number | null;
  onChange: (id: number) => void;
}

/**
 * Selettore di pasto a pillole scorrevoli (i pasti sono dinamici e variabili di
 * numero, quindi non un SegmentedControl a larghezza fissa). Se il valore non è
 * tra i pasti disponibili, seleziona automaticamente il primo.
 */
export function MealPicker({ meals, loading, value, onChange }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const valid = value != null && meals.some((m) => m.id === value);

  useEffect(() => {
    if (!valid && meals.length > 0) onChange(meals[0]!.id);
  }, [valid, meals, onChange]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />;
  if (meals.length === 0) {
    return <Text style={styles.empty}>No meals. Create one from Profile → Meals.</Text>;
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {meals.map((m) => {
        const active = m.id === value;
        return (
          <Pressable
            key={m.id}
            onPress={() => onChange(m.id)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{m.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  textActive: { color: colors.onPrimary },
  empty: { color: colors.textMuted, fontSize: 13 },
});
