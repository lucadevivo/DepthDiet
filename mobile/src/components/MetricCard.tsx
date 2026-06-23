import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { Icon, type IconName } from "./Icon";

interface Props {
  icon: IconName;
  iconColor?: string;
  label: string;
  value: string;
  onPress?: () => void;
  locked?: boolean;
}

/**
 * Riga-metrica in stile "Macros": tile con icona colorata, etichetta maiuscola
 * grigia, valore in evidenza e chevron. Usabile come bottone (con onPress).
 */
export function MetricCard({ icon, iconColor = colors.primary, label, value, onPress, locked }: Props) {
  const Container: typeof Pressable | typeof View = onPress ? Pressable : View;
  return (
    <Container style={styles.card} {...(onPress ? { onPress } : {})}>
      <View style={[styles.tile, { backgroundColor: iconColor + "22" }]}>
        <Icon name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {locked ? (
        <Icon name="settings" size={16} color={colors.textMuted} />
      ) : onPress ? (
        <Icon name="chevron" size={18} color={colors.textMuted} />
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 2 },
});
