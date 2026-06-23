import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

/** Selettore segmentato generico (sesso, obiettivo, ...). */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  segmentActive: { backgroundColor: colors.protein },
  text: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
  textActive: { color: "#fff" },
});
