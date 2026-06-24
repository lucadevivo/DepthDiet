import { View, Text, Pressable, StyleSheet } from "react-native";
import { useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { ProgressBar } from "./ProgressBar";
import { Icon } from "./Icon";
import { useWaterQuery, useAddWater } from "../hooks/useWater";

interface Props {
  /** Giorno del diario (ISO) a cui legare il conteggio. */
  date: string;
  /** Obiettivo idrico in ml (dal fabbisogno calcolato nel profilo). */
  targetMl: number;
}

/** Quantità di un bicchiere: ogni + / - aggiunge o toglie questo. */
const GLASS_ML = 250;

/**
 * Box acqua del diario: progresso verso l'obiettivo (e oltre) con pulsanti + e -.
 * Va in fondo a tutti i pasti. Totale per-giorno persistito sul backend (water_log),
 * con aggiornamento ottimistico per reattività.
 */
export function WaterCounter({ date, targetMl }: Props) {
  const { colors, styles } = useThemed(makeStyles);
  const water = useWaterQuery(date);
  const addWater = useAddWater(date);
  const ml = water.data?.total_ml ?? 0;
  const add = (_date: string, amountMl: number) => addWater.mutate(amountMl);

  const liters = (ml / 1000).toFixed(2);
  const targetL = (targetMl / 1000).toFixed(1);
  const reached = targetMl > 0 && ml >= targetMl;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="water" size={18} color={colors.water} />
          <Text style={styles.title}>Water</Text>
        </View>
        <Text style={styles.amount}>
          {liters} / {targetL} L{reached ? "  ✓" : ""}
        </Text>
      </View>

      <ProgressBar progress={targetMl ? ml / targetMl : 0} color={colors.water} height={10} />

      <View style={styles.buttons}>
        <Pressable
          onPress={() => add(date, -GLASS_ML)}
          disabled={ml <= 0}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, ml <= 0 && styles.btnOff]}
        >
          <Icon name="remove" size={20} color={colors.water} />
          <Text style={styles.btnText}>250 ml</Text>
        </Pressable>
        <Pressable
          onPress={() => add(date, GLASS_ML)}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
        >
          <Icon name="add" size={20} color={colors.onPrimary} />
          <Text style={[styles.btnText, styles.btnTextPrimary]}>250 ml</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { color: colors.text, fontSize: 16, fontWeight: "700" },
    amount: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
    buttons: { flexDirection: "row", gap: 10 },
    btn: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnPrimary: { backgroundColor: colors.water, borderColor: colors.water },
    btnPressed: { opacity: 0.6 },
    btnOff: { opacity: 0.4 },
    btnText: { color: colors.water, fontSize: 15, fontWeight: "800" },
    btnTextPrimary: { color: colors.onPrimary },
  });
