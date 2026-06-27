import { View, Text, Pressable, StyleSheet } from "react-native";
import { useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { Icon } from "./Icon";
import { useI18n } from "../i18n";
import { useCreatineQuery, useSetCreatine } from "../hooks/useCreatine";

interface Props {
  /** Giorno del diario (ISO) a cui legare il flag. */
  date: string;
}

/**
 * Box creatina del diario: una casella da spuntare per segnare se la creatina è
 * stata presa quel giorno. Flag per-giorno persistito sul backend (creatine_log),
 * con aggiornamento ottimistico per reattività.
 */
export function CreatineToggle({ date }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const creatine = useCreatineQuery(date);
  const setCreatine = useSetCreatine(date);
  const taken = creatine.data?.taken ?? false;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => setCreatine.mutate(!taken)}
    >
      <View style={styles.titleRow}>
        {/* Crema fissa: richiama la polvere di creatina, indipendente dall'accento. */}
        <Icon name="creatine" size={18} color="#F0E8D4" />
        <Text style={styles.title}>{t("comp.creatineTaken")}</Text>
      </View>
      <View style={[styles.check, taken && styles.checkOn]}>
        {taken ? <Icon name="check" size={16} color={colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: { opacity: 0.7 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { color: colors.text, fontSize: 16, fontWeight: "700" },
    check: {
      width: 26,
      height: 26,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  });
