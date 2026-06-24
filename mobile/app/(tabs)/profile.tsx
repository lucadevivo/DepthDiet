import { ScrollView, View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { useTheme, useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { StatStrip } from "../../src/components/StatStrip";
import { MetricCard } from "../../src/components/MetricCard";
import { Icon } from "../../src/components/Icon";
import { useProfileQuery } from "../../src/hooks/useProfile";
import { useAdaptiveQuery } from "../../src/hooks/useWeight";
import { bodyMetricsFromProfile } from "../../src/lib/bodyMetrics";
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, type Profile } from "../../src/types/profile";

export default function ProfileScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profileQuery = useProfileQuery();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Profile</Text>

      {profileQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : profileQuery.isError ? (
        <ErrorBox onRetry={() => profileQuery.refetch()} />
      ) : (
        <>
          <ProfileStats profile={profileQuery.data} />
          <ProfileChoices profile={profileQuery.data} />
          <Metrics profile={profileQuery.data} />
          {profileQuery.data?.target_calories != null ? <AdaptiveTdee /> : null}

          {/* Catalogo cibi e ricette (spostato qui dal Diary). */}
          <View style={styles.catalog}>
            <Link href="/foods" asChild>
              <Pressable style={styles.catalogPill}>
                <Icon name="food" size={18} color={colors.textMuted} />
                <Text style={styles.catalogText}>Foods</Text>
              </Pressable>
            </Link>
            <Link href="/recipes" asChild>
              <Pressable style={styles.catalogPill}>
                <Icon name="recipe" size={18} color={colors.textMuted} />
                <Text style={styles.catalogText}>Recipes</Text>
              </Pressable>
            </Link>
            <Link href="/meals" asChild>
              <Pressable style={styles.catalogPill}>
                <Icon name="meals" size={18} color={colors.textMuted} />
                <Text style={styles.catalogText}>Meals</Text>
              </Pressable>
            </Link>
          </View>

          <Pressable style={styles.editBtn} onPress={() => router.push("/edit-data")}>
            <Icon name="profile" size={18} color={colors.onPrimary} />
            <Text style={styles.editText}>Edit your data</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

/** Striscia anagrafica (Height/Weight/Gender/Age) dai dati salvati. */
function ProfileStats({ profile }: { profile: Profile | undefined }) {
  const { colors, styles } = useThemed(makeStyles);
  if (!profile || profile.weight_kg == null) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          No profile yet. Fill in your data below and compute your goals.
        </Text>
      </View>
    );
  }
  const sexLabel = profile.sex === "male" ? "Male" : profile.sex === "female" ? "Female" : "—";
  return (
    <StatStrip
      stats={[
        { label: "Height", value: profile.height_cm != null ? `${profile.height_cm} cm` : "—" },
        { label: "Weight", value: `${profile.weight_kg} kg` },
        { label: "Gender", value: sexLabel },
        { label: "Age", value: profile.age != null ? `${profile.age}` : "—" },
      ]}
    />
  );
}

/** Goal e Activity level come dati utente (sola lettura; si modificano in "Your data"). */
function ProfileChoices({ profile }: { profile: Profile | undefined }) {
  const { colors, styles } = useThemed(makeStyles);
  if (!profile || (profile.goal == null && profile.activity_level == null)) return null;
  const goalLabel = GOAL_OPTIONS.find((o) => o.value === profile.goal)?.label ?? "—";
  const activityLabel =
    ACTIVITY_OPTIONS.find((o) => o.value === profile.activity_level)?.label ?? "—";
  return (
    <View style={styles.choicesCard}>
      <View style={styles.choiceRow}>
        <View style={styles.choiceLabelWrap}>
          <Icon name="goal" size={18} color={colors.textMuted} />
          <Text style={styles.choiceLabel}>Goal</Text>
        </View>
        <Text style={styles.choiceValue}>{goalLabel}</Text>
      </View>
      <View style={styles.choiceSep} />
      <View style={styles.choiceRow}>
        <View style={styles.choiceLabelWrap}>
          <Icon name="activity" size={18} color={colors.textMuted} />
          <Text style={styles.choiceLabel}>Activity level</Text>
        </View>
        <Text style={styles.choiceValue}>{activityLabel}</Text>
      </View>
    </View>
  );
}

/** TDEE adattivo (dal trend del peso): riepilogo + link alla schermata Weight. */
function AdaptiveTdee() {
  const { colors } = useTheme();
  const router = useRouter();
  const adaptive = useAdaptiveQuery();
  const d = adaptive.data;
  const value = !d
    ? "—"
    : d.hasEnoughData && d.trendKgPerWeek != null
      ? `${d.trendKgPerWeek} kg/week`
      : "Log your weight";
  return (
    <MetricCard
      icon="weight"
      iconColor={colors.water}
      label="Adaptive TDEE"
      value={value}
      onPress={() => router.push("/weight")}
    />
  );
}

type MetricKey = "bmr" | "bmi" | "water";

/** Colore FISSO dell'icona BMR: non segue l'accento del tema. */
const BMR_COLOR = "#FF6A3D";

/** Spiegazioni mostrate nel popup quando si tocca una metrica. */
const METRIC_INFO: Record<MetricKey, { title: string; text: string }> = {
  bmr: {
    title: "Basal Metabolic Rate",
    text: "The calories your body burns at complete rest, just to keep vital functions going — breathing, circulation, brain activity. It's your baseline before any movement or exercise is added.",
  },
  bmi: {
    title: "Body Mass Index",
    text: "Your weight relative to your height (kg/m²). It's a quick screening number for under-, normal- and over-weight ranges, but it doesn't tell muscle from fat, so treat it as a rough guide.",
  },
  water: {
    title: "Water requirement",
    text: "An estimate of the fluids your body needs each day, based mainly on your weight. It's a general guideline, not a strict target — your needs rise with heat, exercise and illness.",
  },
};

/** Card metriche calcolate: BMR, BMI, fabbisogno idrico. Toccandole si apre la spiegazione. */
function Metrics({ profile }: { profile: Profile | undefined }) {
  const { colors, styles } = useThemed(makeStyles);
  const [info, setInfo] = useState<MetricKey | null>(null);
  const m = bodyMetricsFromProfile(profile);
  if (!m) return null;
  return (
    <View style={{ gap: 12 }}>
      <MetricCard
        icon="calories"
        iconColor={BMR_COLOR}
        label="Basal Metabolic Rate"
        value={`${m.bmr} kcal`}
        onPress={() => setInfo("bmr")}
        info
      />
      <MetricCard
        icon="bmi"
        iconColor={colors.carbs}
        label="Body Mass Index"
        value={`${m.bmi} · ${m.bmiCategory}`}
        onPress={() => setInfo("bmi")}
        info
      />
      <MetricCard
        icon="water"
        iconColor={colors.water}
        label="Water requirement"
        value={`${(m.waterMl / 1000).toFixed(1)} L`}
        onPress={() => setInfo("water")}
        info
      />

      <Modal visible={info != null} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setInfo(null)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <Text style={styles.infoTitle}>{info ? METRIC_INFO[info].title : ""}</Text>
            <Text style={styles.infoText}>{info ? METRIC_INFO[info].text : ""}</Text>
            <Pressable style={styles.infoBtn} onPress={() => setInfo(null)}>
              <Text style={styles.infoBtnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  const { colors, styles } = useThemed(makeStyles);
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.errorText}>
        Could not load your profile. Make sure the backend is reachable and your credentials are set
        up.
      </Text>
      <Pressable onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.saveText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800" },
  catalog: { flexDirection: "row", gap: 12 },
  catalogPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catalogText: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
  center: { paddingVertical: 40, alignItems: "center" },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textMuted, fontSize: 14 },

  choicesCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    gap: 12,
  },
  choiceLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  choiceLabel: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  choiceValue: { color: colors.text, fontSize: 15, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  choiceSep: { height: 1, backgroundColor: colors.border },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  editText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },

  infoBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: "100%",
  },
  infoTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  infoText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  infoBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  infoBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },

  saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  errorText: { color: colors.fat, fontSize: 13 },
});
