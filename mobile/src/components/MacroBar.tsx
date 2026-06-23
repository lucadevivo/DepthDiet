import { View, Text, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { ProgressBar } from "./ProgressBar";

interface Props {
  label: string;
  current: number;
  target: number;
  color: string;
  /** Le proteine sono enfatizzate: testo più grande e accento dedicato. */
  emphasized?: boolean;
}

/** Riga macro: nome, grammi consumati/target e grammi RIMANENTI al target. */
export function MacroBar({ label, current, target, color, emphasized }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const remaining = Math.max(0, Math.round(target - current));
  return (
    <View style={[styles.container, emphasized && styles.emphasizedBox]}>
      <View style={styles.row}>
        <Text style={[styles.label, emphasized && styles.labelEmph]}>{label}</Text>
        <Text style={styles.values}>
          <Text style={[styles.current, emphasized && styles.currentEmph]}>
            {Math.round(current)}
          </Text>
          <Text style={styles.target}> / {Math.round(target)} g</Text>
        </Text>
      </View>
      <ProgressBar progress={target ? current / target : 0} color={color} height={emphasized ? 12 : 8} />
      <Text style={styles.remaining}>
        {remaining > 0 ? `${remaining} g rimanenti` : "obiettivo raggiunto ✅"}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { gap: 6 },
  emphasizedBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.protein,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  labelEmph: { color: colors.text, fontSize: 16, fontWeight: "700" },
  values: { textAlign: "right" },
  current: { color: colors.text, fontSize: 14, fontWeight: "700" },
  currentEmph: { fontSize: 18 },
  target: { color: colors.textMuted, fontSize: 13 },
  remaining: { color: colors.textMuted, fontSize: 12 },
});
