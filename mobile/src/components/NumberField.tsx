import { View, Text, TextInput, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  unit?: string;
  placeholder?: string;
}

/** Campo numerico etichettato (peso, altezza, età, grammi...). */
export function NumberField({ label, value, onChangeText, unit, placeholder }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          inputMode="decimal"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1, gap: 6 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, fontWeight: "600", paddingVertical: 12 },
  unit: { color: colors.textMuted, fontSize: 14 },
});
