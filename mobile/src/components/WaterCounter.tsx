import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { ProgressBar } from "./ProgressBar";
import { useWaterStore } from "../store/waterStore";

interface Props {
  targetMl: number;
}

const QUICK_ADDS = [250, 500, -250];

/** Contatore acqua con pulsanti veloci (+250ml, +500ml, -250ml). Stato in Zustand. */
export function WaterCounter({ targetMl }: Props) {
  const ml = useWaterStore((s) => s.ml);
  const add = useWaterStore((s) => s.add);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Acqua</Text>
        <Text style={styles.amount}>
          {(ml / 1000).toFixed(2)} / {(targetMl / 1000).toFixed(1)} L
        </Text>
      </View>
      <ProgressBar progress={targetMl ? ml / targetMl : 0} color={colors.water} height={10} />
      <View style={styles.buttons}>
        {QUICK_ADDS.map((amount) => (
          <Pressable
            key={amount}
            onPress={() => add(amount)}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnText}>
              {amount > 0 ? `+${amount}` : `${amount}`} ml
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  amount: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  buttons: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPressed: { opacity: 0.6 },
  btnText: { color: colors.water, fontSize: 14, fontWeight: "700" },
});
