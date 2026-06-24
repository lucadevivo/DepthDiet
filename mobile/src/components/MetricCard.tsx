import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme, useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { Icon, type IconName } from "./Icon";

interface Props {
  icon: IconName;
  iconColor?: string;
  label: string;
  value: string;
  onPress?: () => void;
  locked?: boolean;
  /** La card apre una spiegazione: mostra una "lampadina" invece della freccetta. */
  info?: boolean;
}

/**
 * Riga-metrica in stile "Macros": tile con icona colorata, etichetta maiuscola
 * grigia, valore in evidenza e indicatore a destra. Usabile come bottone (onPress).
 * Con `info` l'indicatore è una lampadina (apre una spiegazione), altrimenti una
 * freccetta (navigazione).
 */
export function MetricCard({ icon, iconColor, label, value, onPress, locked, info }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const tint = iconColor ?? colors.primary;
  const Container: typeof Pressable | typeof View = onPress ? Pressable : View;
  return (
    <Container style={styles.card} {...(onPress ? { onPress } : {})}>
      <View style={[styles.tile, { backgroundColor: tint + "22" }]}>
        <Icon name={icon} size={22} color={tint} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      {locked ? (
        <Icon name="settings" size={16} color={colors.textMuted} />
      ) : info ? (
        <Icon name="bulb" size={20} color={colors.textMuted} />
      ) : onPress ? (
        <Icon name="chevron" size={18} color={colors.textMuted} />
      ) : null}
    </Container>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
