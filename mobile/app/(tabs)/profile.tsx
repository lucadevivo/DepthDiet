import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useTheme, useThemed } from "../../src/theme/ThemeProvider";
import type { ThemeColors } from "../../src/theme/colors";
import { NumberField } from "../../src/components/NumberField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { OptionList } from "../../src/components/OptionList";
import { StatStrip } from "../../src/components/StatStrip";
import { MetricCard } from "../../src/components/MetricCard";
import { Icon } from "../../src/components/Icon";
import { useProfileQuery, useUpdateProfile } from "../../src/hooks/useProfile";
import { bodyMetricsFromProfile } from "../../src/lib/bodyMetrics";
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  type ActivityLevel,
  type Goal,
  type Profile,
  type Sex,
} from "../../src/types/profile";

export default function ProfileScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const insets = useSafeAreaInsets();
  const profileQuery = useProfileQuery();
  const updateProfile = useUpdateProfile();

  // Stato del form (i numerici come stringa per l'input).
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Inizializza il form dai dati del profilo, una sola volta.
  useEffect(() => {
    const p = profileQuery.data;
    if (p && !seeded) {
      if (p.weight_kg != null) setWeight(String(p.weight_kg));
      if (p.height_cm != null) setHeight(String(p.height_cm));
      if (p.age != null) setAge(String(p.age));
      setSex(p.sex);
      setActivity(p.activity_level);
      setGoal(p.goal);
      setSeeded(true);
    }
  }, [profileQuery.data, seeded]);

  const w = Number.parseFloat(weight);
  const h = Number.parseFloat(height);
  const a = Number.parseInt(age, 10);
  const valid =
    Number.isFinite(w) && Number.isFinite(h) && Number.isFinite(a) && !!sex && !!activity && !!goal;

  const onSave = () => {
    if (!valid) return;
    // Mantiene il preset dieta corrente; i macro vengono ricalcolati sul nuovo target.
    updateProfile.mutate({
      weight_kg: w,
      height_cm: h,
      age: a,
      sex,
      activity_level: activity,
      goal,
      diet_preset: profileQuery.data?.diet_preset ?? "standard",
      formula: profileQuery.data?.formula ?? "mifflin",
      body_fat_pct: profileQuery.data?.body_fat_pct ?? null,
      ...(profileQuery.data?.diet_preset === "custom" &&
      profileQuery.data.diet_carbs_pct != null
        ? {
            custom_pct: {
              carbs_pct: profileQuery.data.diet_carbs_pct,
              protein_pct: profileQuery.data.diet_protein_pct ?? 0,
              fat_pct: profileQuery.data.diet_fat_pct ?? 0,
            },
          }
        : {}),
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Text style={styles.heading}>Profile</Text>
        <Link href="/weight" asChild>
          <Pressable style={styles.weightBtn} hitSlop={8}>
            <Icon name="weight" size={18} color={colors.textMuted} />
            <Text style={styles.weightBtnText}>Weight</Text>
          </Pressable>
        </Link>
      </View>

      {profileQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : profileQuery.isError ? (
        <ErrorBox onRetry={() => profileQuery.refetch()} />
      ) : (
        <>
          <ProfileStats profile={profileQuery.data} />
          <Metrics profile={profileQuery.data} />

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

          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Your data</Text>
            <View style={styles.fieldRow}>
              <NumberField label="Weight" value={weight} onChangeText={setWeight} unit="kg" />
              <NumberField label="Height" value={height} onChangeText={setHeight} unit="cm" />
              <NumberField label="Age" value={age} onChangeText={setAge} unit="y" />
            </View>

            <Label text="Gender" />
            <SegmentedControl options={SEX_OPTIONS} value={sex} onChange={setSex} />

            <Label text="Goal" />
            <OptionList options={GOAL_OPTIONS} value={goal} onChange={setGoal} />

            <Label text="Activity level" />
            <OptionList options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />

            <Pressable
              onPress={onSave}
              disabled={!valid || updateProfile.isPending}
              style={[styles.saveBtn, (!valid || updateProfile.isPending) && styles.saveBtnDisabled]}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.saveText}>Save & compute goals</Text>
              )}
            </Pressable>

            {updateProfile.isError ? (
              <Text style={styles.errorText}>
                Could not save. Check your connection/credentials and try again.
              </Text>
            ) : null}
            {updateProfile.isSuccess ? (
              <Text style={styles.successText}>
                Goals updated — BMR {updateProfile.data.computation.bmr} · TDEE{" "}
                {updateProfile.data.computation.tdee} kcal
              </Text>
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  const { colors, styles } = useThemed(makeStyles);
  return <Text style={styles.fieldLabel}>{text}</Text>;
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

/** Card metriche calcolate: BMR, BMI, fabbisogno idrico. */
function Metrics({ profile }: { profile: Profile | undefined }) {
  const { colors, styles } = useThemed(makeStyles);
  const m = bodyMetricsFromProfile(profile);
  if (!m) return null;
  return (
    <View style={{ gap: 12 }}>
      <MetricCard
        icon="calories"
        iconColor={colors.primary}
        label="Basal Metabolic Rate"
        value={`${m.bmr} kcal`}
      />
      <MetricCard
        icon="bmi"
        iconColor={colors.carbs}
        label="Body Mass Index"
        value={`${m.bmi} · ${m.bmiCategory}`}
      />
      <MetricCard
        icon="water"
        iconColor={colors.water}
        label="Water requirement"
        value={`${(m.waterMl / 1000).toFixed(1)} L`}
      />
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
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weightBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  weightBtnText: { color: colors.textMuted, fontSize: 15, fontWeight: "700" },
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

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 },

  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  errorText: { color: colors.fat, fontSize: 13 },
  successText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
});
