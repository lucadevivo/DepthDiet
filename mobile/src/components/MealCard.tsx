import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { Icon } from "./Icon";
import type { DiaryEntry } from "../types/diary";

interface Props {
  title: string;
  entries: DiaryEntry[];
  onAdd: () => void;
  onDelete: (id: number) => void;
  /** Nasconde il bottone "Add" (es. gruppo "Other" dei pasti eliminati). */
  showAdd?: boolean;
}

/** Una cella della mini-tabella macro (valore sopra, etichetta colorata sotto). */
function MacroCell({ value, label, color, unit = "" }: { value: number; label: string; color: string; unit?: string }) {
  const { colors, styles } = useThemed(makeStyles);
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>
        {Math.round(value)}
        {unit}
      </Text>
      <Text style={[styles.cellLabel, { color }]}>{label}</Text>
    </View>
  );
}

/**
 * Scheda di un pasto in stile "Macros": titolo, riepilogo macro a 4 colonne
 * (Carb/Prot/Grassi/Calorie), elenco voci con eliminazione e bottone "Aggiungi".
 * I totali del pasto sono calcolati dalle voci.
 */
export function MealCard({ title, entries, onAdd, onDelete, showAdd = true }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const t = entries.reduce(
    (acc, e) => {
      acc.kcal += e.kcal;
      acc.protein += e.protein_g;
      acc.carbs += e.carbs_g;
      acc.fat += e.fat_g;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.macroRow}>
        <MacroCell value={t.carbs} label="Carbs" color={colors.carbs} unit="g" />
        <MacroCell value={t.protein} label="Protein" color={colors.protein} unit="g" />
        <MacroCell value={t.fat} label="Fat" color={colors.fat} unit="g" />
        <MacroCell value={t.kcal} label="Calories" color={colors.textMuted} />
      </View>

      {entries.length > 0 ? (
        <View style={styles.entries}>
          {entries.map((e) => (
            <View key={e.id} style={styles.entry}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryName} numberOfLines={1}>
                  {e.description ?? "Voce"}
                </Text>
                <Text style={styles.entryMeta}>
                  {e.grams != null ? `${e.grams} g · ` : ""}
                  {e.kcal} kcal
                </Text>
              </View>
              <Pressable onPress={() => onDelete(e.id)} hitSlop={10} style={styles.del}>
                <Icon name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {showAdd ? (
        <Pressable onPress={onAdd} style={styles.addBtn} hitSlop={6}>
          <Icon name="add" size={18} color={colors.primary} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: "700" },

  macroRow: { flexDirection: "row" },
  cell: { flex: 1, alignItems: "center", gap: 2 },
  cellValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  cellLabel: { fontSize: 11, fontWeight: "600" },

  entries: { gap: 8 },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  entryName: { color: colors.text, fontSize: 14, fontWeight: "600" },
  entryMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  del: { paddingLeft: 12 },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    alignSelf: "center",
    paddingVertical: 4,
  },
  addText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
});
