import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { Icon } from "./Icon";

interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

/**
 * Lista di opzioni a righe verticali con checkmark sull'attiva. Adatta a opzioni
 * con etichette lunghe (Goal a 5, Activity level) dove il segmented sarebbe stretto.
 */
export function OptionList<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, styles } = useThemed(makeStyles);
  return (
    <View style={{ gap: 8 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.row, active && styles.rowActive]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
              {opt.desc ? <Text style={styles.desc}>{opt.desc}</Text> : null}
            </View>
            {active ? <Icon name="check" size={18} color={colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: { borderColor: colors.primary },
  label: { color: colors.text, fontSize: 15, fontWeight: "700" },
  labelActive: { color: colors.primary },
  desc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
