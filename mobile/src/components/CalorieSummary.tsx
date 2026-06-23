import { View, Text, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { ProgressBar } from "./ProgressBar";

interface Props {
  consumed: number;
  target: number;
}

/** Intestazione della Dashboard: calorie consumate vs obiettivo, ben visibili in alto. */
export function CalorieSummary({ consumed, target }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const remaining = Math.round(target - consumed);
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>OGGI</Text>
      <View style={styles.numbers}>
        <Text style={styles.consumed}>{Math.round(consumed)}</Text>
        <Text style={styles.target}> / {Math.round(target)} kcal</Text>
      </View>
      <ProgressBar progress={target ? consumed / target : 0} color={colors.calories} height={10} />
      <Text style={styles.remaining}>
        {remaining >= 0
          ? `${remaining} kcal rimanenti`
          : `${Math.abs(remaining)} kcal oltre l'obiettivo`}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kicker: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  numbers: { flexDirection: "row", alignItems: "baseline" },
  consumed: { color: colors.text, fontSize: 40, fontWeight: "800" },
  target: { color: colors.textMuted, fontSize: 18, fontWeight: "600" },
  remaining: { color: colors.calories, fontSize: 13, fontWeight: "600" },
});
