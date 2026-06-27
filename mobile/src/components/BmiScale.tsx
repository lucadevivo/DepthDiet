import { View, Text, StyleSheet } from "react-native";
import { useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";
import { useI18n } from "../i18n";

/**
 * Scala BMI visuale (#3): barra a 4 fasce OMS (sottopeso/normale/sovrappeso/obeso)
 * con un indicatore nel punto del valore dell'utente, così si capisce a colpo
 * d'occhio dove cade il numero mostrato.
 */

// Estremi visuali della barra e confini fra le fasce (in unità BMI).
const MIN = 15;
const MAX = 40;
const BOUNDS = [18.5, 25, 30];

interface Band {
  key: string;
  from: number;
  to: number;
  color: keyof ThemeColors;
}

const BANDS: Band[] = [
  { key: "bmi.underweight", from: MIN, to: 18.5, color: "water" },
  { key: "bmi.normal", from: 18.5, to: 25, color: "protein" },
  { key: "bmi.overweight", from: 25, to: 30, color: "carbs" },
  { key: "bmi.obese", from: 30, to: MAX, color: "fat" },
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function BmiScale({ value }: { value: number }) {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const markerPct = clamp01((value - MIN) / (MAX - MIN));

  return (
    <View style={styles.wrap}>
      {/* Barra colorata: ogni fascia è larga in proporzione al suo range. */}
      <View style={styles.bar}>
        {BANDS.map((b) => (
          <View
            key={b.key}
            style={{ flex: b.to - b.from, backgroundColor: colors[b.color] as string }}
          />
        ))}
      </View>

      {/* Indicatore del valore dell'utente. */}
      <View style={[styles.markerWrap, { left: `${markerPct * 100}%` }]}>
        <View style={styles.markerDot} />
        <Text style={styles.markerLabel}>{t("bmi.youAreHere", { v: value })}</Text>
      </View>

      {/* Confini numerici fra le fasce. */}
      <View style={styles.ticks}>
        {BOUNDS.map((bnd) => (
          <Text
            key={bnd}
            style={[styles.tick, { left: `${clamp01((bnd - MIN) / (MAX - MIN)) * 100}%` }]}
          >
            {bnd}
          </Text>
        ))}
      </View>

      {/* Etichette delle fasce. */}
      <View style={styles.legend}>
        {BANDS.map((b) => (
          <View key={b.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors[b.color] as string }]} />
            <Text style={styles.legendText}>{t(b.key)}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.hint}>{t("bmi.scaleHint")}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: 8, marginTop: 4 },
    bar: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden" },
    markerWrap: { position: "absolute", top: 0, alignItems: "center", marginLeft: -20, width: 40 },
    markerDot: {
      width: 4,
      height: 16,
      borderRadius: 2,
      backgroundColor: colors.text,
      marginTop: -2,
    },
    markerLabel: { color: colors.text, fontSize: 11, fontWeight: "800", marginTop: 2 },
    ticks: { height: 14, marginTop: 16 },
    tick: { position: "absolute", color: colors.textMuted, fontSize: 10, marginLeft: -8, width: 16, textAlign: "center" },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendDot: { width: 9, height: 9, borderRadius: 5 },
    legendText: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
    hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  });
