import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { Icon } from "../src/components/Icon";
import { useTheme, useThemed, type ThemeMode } from "../src/theme/ThemeProvider";
import type { ThemeColors, ColorOption } from "../src/theme/colors";
import { useI18n } from "../src/i18n";

/**
 * Schermata dedicata all'aspetto: tema chiaro/scuro, accento cromatico, colore di
 * sfondo e dei box. In cima una box d'esempio mostra dal vivo la combinazione
 * scelta (il tema è applicato a tutta l'app, quindi l'anteprima è sempre reale).
 */
export default function AppearanceScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
    { value: "dark", label: t("appearance.dark") },
    { value: "light", label: t("appearance.light") },
    { value: "system", label: t("appearance.system") },
  ];
  const {
    mode,
    setMode,
    scheme,
    accentId,
    setAccentId,
    accents,
    bgColorId,
    setBgColorId,
    bgPresets,
    surfaceColorId,
    setSurfaceColorId,
    surfacePresets,
  } = useTheme();

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("settings.appearance")} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Anteprima dal vivo della combinazione di colori. */}
        <Text style={styles.group}>{t("appearance.preview")}</Text>
        <View style={styles.preview}>
          <View style={styles.previewTotals}>
            <Text style={styles.previewKcal}>1,480</Text>
            <Text style={styles.previewKcalSub}> / 2,600 kcal</Text>
          </View>
          <View style={styles.previewBar}>
            <View style={[styles.previewBarFill, { backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.previewMacros}>
            <PreviewMacro label={t("common.carbs")} color={colors.carbs} styles={styles} />
            <PreviewMacro label={t("common.protein")} color={colors.protein} styles={styles} />
            <PreviewMacro label={t("common.fat")} color={colors.fat} styles={styles} />
          </View>
          <View style={[styles.previewBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.previewBtnText, { color: colors.onPrimary }]}>{t("appearance.addFood")}</Text>
          </View>
          <Text style={styles.previewMuted}>{t("appearance.previewMuted")}</Text>
        </View>

        {/* Tema chiaro/scuro */}
        <Text style={styles.group}>{t("appearance.theme")}</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("appearance.lightDark")}</Text>
          <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />
        </View>

        {/* Accento */}
        <Text style={styles.group}>{t("appearance.colorTheme")}</Text>
        <View style={styles.card}>
          <View style={styles.swatches}>
            {accents.map((a) => {
              const tint = scheme === "light" ? a.light.primary : a.dark.primary;
              const onTint = scheme === "light" ? a.light.onPrimary : a.dark.onPrimary;
              const active = a.id === accentId;
              return (
                <Pressable key={a.id} onPress={() => setAccentId(a.id)} style={styles.swatchItem}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: tint, borderColor: active ? colors.text : "transparent" },
                    ]}
                  >
                    {active ? <Icon name="check" size={18} color={onTint} /> : null}
                  </View>
                  <Text style={[styles.swatchLabel, active && styles.swatchLabelActive]}>
                    {a.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sfondo */}
        <Text style={styles.group}>{t("appearance.bgColor")}</Text>
        <View style={styles.card}>
          <ColorSwatches options={bgPresets} activeId={bgColorId} onSelect={setBgColorId} />
        </View>

        {/* Box */}
        <Text style={styles.group}>{t("appearance.boxColor")}</Text>
        <View style={styles.card}>
          <ColorSwatches options={surfacePresets} activeId={surfaceColorId} onSelect={setSurfaceColorId} />
        </View>
      </ScrollView>
    </View>
  );
}

function PreviewMacro({
  label,
  color,
  styles,
}: {
  label: string;
  color: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.previewMacro}>
      <View style={[styles.previewDot, { backgroundColor: color }]} />
      <Text style={[styles.previewMacroLabel, { color }]}>{label}</Text>
    </View>
  );
}

/** Vero se il colore è chiaro (per scegliere il colore del check sopra). */
function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

/** Riga di pastiglie colore (sfondo o box). */
function ColorSwatches({
  options,
  activeId,
  onSelect,
}: {
  options: ColorOption[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  return (
    <View style={styles.swatches}>
      {options.map((o) => {
        const active = o.id === activeId;
        return (
          <Pressable key={o.id} onPress={() => onSelect(o.id)} style={styles.swatchItem}>
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: o.value,
                  borderColor: active ? colors.primary : colors.border,
                  borderWidth: active ? 3 : 1,
                },
              ]}
            >
              {active ? <Icon name="check" size={18} color={isLight(o.value) ? "#111" : "#fff"} /> : null}
            </View>
            <Text style={[styles.swatchLabel, active && styles.swatchLabelActive]} numberOfLines={1}>
              {o.id === "default" ? t("appearance.default") : o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 8, paddingBottom: 40 },
    group: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 12,
      marginBottom: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },

    // Preview
    preview: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    previewTotals: { flexDirection: "row", alignItems: "baseline" },
    previewKcal: { color: colors.text, fontSize: 26, fontWeight: "800" },
    previewKcalSub: { color: colors.textMuted, fontSize: 15, fontWeight: "600" },
    previewBar: { height: 10, borderRadius: 5, backgroundColor: colors.surfaceAlt, overflow: "hidden" },
    previewBarFill: { height: "100%", width: "57%", borderRadius: 5 },
    previewMacros: { flexDirection: "row", gap: 20 },
    previewMacro: { flexDirection: "row", alignItems: "center", gap: 6 },
    previewDot: { width: 10, height: 10, borderRadius: 5 },
    previewMacroLabel: { fontSize: 13, fontWeight: "700" },
    previewBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
    previewBtnText: { fontSize: 15, fontWeight: "800" },
    previewMuted: { color: colors.textMuted, fontSize: 12, textAlign: "center" },

    swatches: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    swatchItem: { alignItems: "center", gap: 6, width: 64 },
    swatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      alignItems: "center",
      justifyContent: "center",
    },
    swatchLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    swatchLabelActive: { color: colors.text, fontWeight: "800" },
  });
