import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "../../src/components/ScreenHeader";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { Icon } from "../../src/components/Icon";
import { useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { useI18n } from "../../src/i18n";
import { todayISO } from "../../src/lib/date";
import { useSuggestMeal } from "../../src/hooks/useSuggest";
import { ApiError } from "../../src/api/client";
import type { MealSuggestion } from "../../src/types/suggest";

type Scope = "library" | "any";

/**
 * Suggeritore IA: calcola i macro mancanti del giorno e propone cosa mangiare.
 * L'utente sceglie se restare nella propria libreria (Alimenti/Ricette) o lasciare
 * spaziare l'IA su qualsiasi alimento.
 */
export default function SuggestScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ date?: string }>();
  const date =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();

  const SCOPE_OPTIONS: { value: Scope; label: string }[] = [
    { value: "library", label: t("suggest.scopeLibrary") },
    { value: "any", label: t("suggest.scopeAny") },
  ];

  const [scope, setScope] = useState<Scope>("library");
  const [note, setNote] = useState("");
  const suggest = useSuggestMeal();

  const run = () =>
    suggest.mutate({
      date,
      onlyLibrary: scope === "library",
      note: note.trim() || undefined,
      lang,
    });

  const result = suggest.data;
  const notConfigured = suggest.error instanceof ApiError && suggest.error.status === 503;
  const rateLimited = suggest.error instanceof ApiError && suggest.error.status === 429;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader title={t("suggest.title")} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.lead}>{t("suggest.lead")}</Text>

        <Text style={styles.fieldLabel}>{t("suggest.from")}</Text>
        <SegmentedControl options={SCOPE_OPTIONS} value={scope} onChange={setScope} />

        <Text style={styles.fieldLabel}>{t("suggest.noteLabel")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("suggest.notePlaceholder")}
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
          multiline
        />

        <Pressable
          style={[styles.runBtn, suggest.isPending && styles.disabled]}
          onPress={run}
          disabled={suggest.isPending}
        >
          {suggest.isPending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Icon name="bulb" size={20} color={colors.onPrimary} />
              <Text style={styles.runText}>{result ? t("suggest.ctaAgain") : t("suggest.cta")}</Text>
            </>
          )}
        </Pressable>

        {result ? (
          <View style={styles.remainingCard}>
            <Text style={styles.remainingLabel}>{t("suggest.leftToGoal")}</Text>
            <Text style={styles.remainingKcal}>{Math.round(result.remaining.kcal)} kcal</Text>
            <Text style={styles.remainingMacros}>
              P {Math.round(result.remaining.protein_g)} · C {Math.round(result.remaining.carbs_g)} ·
              F {Math.round(result.remaining.fat_g)}
            </Text>
          </View>
        ) : null}

        {result?.notes ? (
          <View style={styles.notesRow}>
            <Icon name="bulb" size={16} color={colors.textMuted} />
            <Text style={styles.notes}>{result.notes}</Text>
          </View>
        ) : null}

        {result?.suggestions.map((s, i) => (
          <SuggestionCard key={`${i}-${s.name}`} s={s} styles={styles} colors={colors} fromLibraryLabel={t("suggest.fromLibrary")} />
        ))}

        {result && result.suggestions.length === 0 && !result.notes ? (
          <Text style={styles.empty}>{t("suggest.empty")}</Text>
        ) : null}

        {notConfigured ? (
          <Text style={styles.error}>{t("suggest.errNotConfigured")}</Text>
        ) : rateLimited ? (
          <Text style={styles.error}>{t("suggest.errRateLimited")}</Text>
        ) : suggest.isError ? (
          <Text style={styles.error}>{t("suggest.errGeneric")}</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SuggestionCard({
  s,
  styles,
  colors,
  fromLibraryLabel,
}: {
  s: MealSuggestion;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  fromLibraryLabel: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardName}>{s.name}</Text>
        {s.from_library ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{fromLibraryLabel}</Text>
          </View>
        ) : null}
      </View>
      {s.portion ? <Text style={styles.portion}>{s.portion}</Text> : null}
      {s.reason ? <Text style={styles.reason}>{s.reason}</Text> : null}
      <View style={styles.macroRow}>
        <Text style={styles.kcal}>{Math.round(s.kcal)} kcal</Text>
        <Text style={[styles.macro, { color: colors.carbs }]}>C {Math.round(s.carbs_g)}</Text>
        <Text style={[styles.macro, { color: colors.protein }]}>P {Math.round(s.protein_g)}</Text>
        <Text style={[styles.macro, { color: colors.fat }]}>F {Math.round(s.fat_g)}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 12, paddingBottom: 60 },
    lead: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
    fieldLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 2 },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 16,
      paddingHorizontal: 12,
      paddingVertical: 12,
      minHeight: 48,
    },
    runBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 4,
    },
    runText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
    disabled: { opacity: 0.6 },

    remainingCard: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      gap: 2,
      marginTop: 4,
    },
    remainingLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
    remainingKcal: { color: colors.calories, fontSize: 24, fontWeight: "900" },
    remainingMacros: { color: colors.text, fontSize: 14 },

    notesRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
    notes: { color: colors.textMuted, fontSize: 13, fontStyle: "italic", flex: 1 },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    cardName: { color: colors.text, fontSize: 16, fontWeight: "800", flex: 1 },
    badge: {
      backgroundColor: colors.primary + "22",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: { color: colors.primary, fontSize: 11, fontWeight: "700" },
    portion: { color: colors.text, fontSize: 14, fontWeight: "600" },
    reason: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
    macroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
    kcal: { color: colors.text, fontSize: 14, fontWeight: "800" },
    macro: { fontSize: 13, fontWeight: "700" },

    empty: { color: colors.textMuted, fontSize: 13 },
    error: { color: colors.fat, fontSize: 13, lineHeight: 18 },
  });
