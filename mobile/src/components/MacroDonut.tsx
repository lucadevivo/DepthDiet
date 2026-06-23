import { View, Text, StyleSheet } from "react-native";
import { useThemed } from "../theme/ThemeProvider";
import type { ThemeColors } from "../theme/colors";

interface Props {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  size?: number;
  thickness?: number;
}

const KCAL = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * Wedge (spicchio) senza SVG: un semidisco colorato dentro a un clip della metà
 * destra, ruotato attorno al centro del cerchio per "aprire" l'angolo voluto.
 * `start`/`sweep` in gradi, orario, 0° = ore 12. `sweep` ≤ 180 (gli spicchi più
 * larghi vengono spezzati in più pezzi dal chiamante).
 */
function Wedge({ size, start, sweep, color }: { size: number; start: number; sweep: number; color: string }) {
  const r = size / 2;
  return (
    <View
      style={{ position: "absolute", width: size, height: size, transform: [{ rotate: `${start}deg` }] }}
    >
      {/* clip alla metà destra del cerchio */}
      <View style={{ position: "absolute", top: 0, left: r, width: r, height: size, overflow: "hidden" }}>
        {/* semidisco sinistro: invisibile a sweep=0 (sta nella metà sinistra),
            ruotato in senso orario attorno al centro (bordo sinistro del clip). */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: -r,
            width: r,
            height: size,
            borderTopLeftRadius: r,
            borderBottomLeftRadius: r,
            backgroundColor: color,
            transform: [{ translateX: r / 2 }, { rotate: `${sweep}deg` }, { translateX: -r / 2 }],
          }}
        />
      </View>
    </View>
  );
}

/** Spezza uno spicchio in pezzi ≤ 180° (limite del metodo a semidisco). */
function arcPieces(start: number, sweep: number, color: string, keyBase: string) {
  const pieces: { key: string; start: number; sweep: number; color: string }[] = [];
  let s = start;
  let remaining = sweep;
  let i = 0;
  while (remaining > 0.01) {
    const c = Math.min(180, remaining);
    pieces.push({ key: `${keyBase}-${i}`, start: s, sweep: c, color });
    s += c;
    remaining -= c;
    i += 1;
  }
  return pieces;
}

/**
 * Ciambella tricolore dei macro (no react-native-svg). Il buco centrale mostra le
 * calorie totali; sotto, la legenda con grammi e percentuale.
 */
export function MacroDonut({ protein_g, carbs_g, fat_g, size = 180, thickness = 26 }: Props) {
  const { colors, styles } = useThemed(makeStyles);

  const kc = { carbs: carbs_g * KCAL.carbs, protein: protein_g * KCAL.protein, fat: fat_g * KCAL.fat };
  const tot = kc.carbs + kc.protein + kc.fat;
  const pct = (v: number) => (tot > 0 ? Math.round((v / tot) * 100) : 0);

  const segments = [
    { key: "carbs", g: carbs_g, kc: kc.carbs, color: colors.carbs, label: "Carbs" },
    { key: "protein", g: protein_g, kc: kc.protein, color: colors.protein, label: "Protein" },
    { key: "fat", g: fat_g, kc: kc.fat, color: colors.fat, label: "Fat" },
  ];

  // Spicchi cumulativi (saltando i macro a 0).
  const wedges: { key: string; start: number; sweep: number; color: string }[] = [];
  let cursor = 0;
  if (tot > 0) {
    for (const s of segments) {
      if (s.kc <= 0) continue;
      const sweep = (s.kc / tot) * 360;
      wedges.push(...arcPieces(cursor, sweep, s.color, s.key));
      cursor += sweep;
    }
  }

  const hole = size - thickness * 2;

  return (
    <View style={{ gap: 16, alignItems: "center" }}>
      <View style={{ width: size, height: size }}>
        {tot > 0 ? (
          wedges.map((w) => <Wedge key={w.key} size={size} start={w.start} sweep={w.sweep} color={w.color} />)
        ) : (
          <View
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.surfaceAlt,
            }}
          />
        )}
        {/* buco centrale */}
        <View
          style={[
            styles.hole,
            { width: hole, height: hole, borderRadius: hole / 2, top: thickness, left: thickness },
          ]}
        >
          <Text style={styles.holeValue}>{Math.round(tot)}</Text>
          <Text style={styles.holeLabel}>kcal</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {segments.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <View>
              <Text style={styles.legendLabel}>{s.label}</Text>
              <Text style={styles.legendValue}>
                {Math.round(s.g)} g · {pct(s.kc)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    hole: {
      position: "absolute",
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    holeValue: { color: colors.text, fontSize: 26, fontWeight: "800" },
    holeLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    legend: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 12, height: 12, borderRadius: 6 },
    legendLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    legendValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  });
