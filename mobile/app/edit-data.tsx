import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, Modal, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { NumberField } from "../src/components/NumberField";
import { SegmentedControl } from "../src/components/SegmentedControl";
import { OptionList } from "../src/components/OptionList";
import { Icon } from "../src/components/Icon";
import { useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { useProfileQuery, useUpdateProfile } from "../src/hooks/useProfile";
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "../src/types/profile";

/** Spiegazioni mostrate nel popup (lampadina) accanto a Goal/Activity. */
const FIELD_INFO: Record<"goal" | "activity", { title: string; text: string }> = {
  goal: {
    title: "Goal",
    text:
      "How your daily calories are shifted from your maintenance (TDEE) to reach your goal — a deficit to lose weight, a surplus to gain:\n\n" +
      "• Lose weight: −20%\n• Lose weight slowly: −10%\n• Maintain: 0% (normocaloric)\n• Light bulk: +10%\n• Bulk: +20%",
  },
  activity: {
    title: "Activity level",
    text:
      "How much you move on top of your basal metabolism. It multiplies your BMR to estimate the calories you burn in a day (your TDEE):\n\n" +
      "• Sedentary: ×1.2 (little or no exercise)\n• Light: ×1.375 (1–3 workouts/week)\n• Moderate: ×1.55 (3–5/week)\n• Active: ×1.725 (6–7/week)\n• Very active: ×1.9 (2×/day or physical job)",
  },
};

/** Form anagrafico (peso/altezza/età, gender, goal, attività) come schermata a sé. */
export default function EditDataScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const router = useRouter();
  const profileQuery = useProfileQuery();
  const updateProfile = useUpdateProfile();

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [info, setInfo] = useState<"goal" | "activity" | null>(null);

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
    const p = profileQuery.data;
    updateProfile.mutate(
      {
        weight_kg: w,
        height_cm: h,
        age: a,
        sex,
        activity_level: activity,
        goal,
        diet_preset: p?.diet_preset ?? "standard",
        formula: p?.formula ?? "mifflin",
        body_fat_pct: p?.body_fat_pct ?? null,
        ...(p?.diet_preset === "custom" && p.diet_carbs_pct != null
          ? {
              custom_pct: {
                carbs_pct: p.diet_carbs_pct,
                protein_pct: p.diet_protein_pct ?? 0,
                fat_pct: p.diet_fat_pct ?? 0,
              },
            }
          : {}),
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Your data" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fieldRow}>
          <NumberField label="Weight" value={weight} onChangeText={setWeight} unit="kg" />
          <NumberField label="Height" value={height} onChangeText={setHeight} unit="cm" />
          <NumberField label="Age" value={age} onChangeText={setAge} unit="y" />
        </View>

        <Text style={styles.fieldLabel}>Gender</Text>
        <SegmentedControl options={SEX_OPTIONS} value={sex} onChange={setSex} />

        <LabelWithInfo label="Goal" onInfo={() => setInfo("goal")} styles={styles} colors={colors} />
        <OptionList options={GOAL_OPTIONS} value={goal} onChange={setGoal} />

        <LabelWithInfo
          label="Activity level"
          onInfo={() => setInfo("activity")}
          styles={styles}
          colors={colors}
        />
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
      </ScrollView>

      <Modal visible={info != null} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setInfo(null)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <Text style={styles.infoTitle}>{info ? FIELD_INFO[info].title : ""}</Text>
            <Text style={styles.infoText}>{info ? FIELD_INFO[info].text : ""}</Text>
            <Pressable style={styles.infoBtn} onPress={() => setInfo(null)}>
              <Text style={styles.infoBtnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Etichetta di sezione con una lampadina che apre la spiegazione. */
function LabelWithInfo({
  label,
  onInfo,
  styles,
  colors,
}: {
  label: string;
  onInfo: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={onInfo} hitSlop={10}>
        <Icon name="bulb" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 16, gap: 14, paddingBottom: 48 },
    fieldRow: { flexDirection: "row", gap: 10 },
    fieldLabel: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
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
    infoText: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
    infoBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 4,
    },
    infoBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "800" },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 6,
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveText: { color: colors.onPrimary, fontSize: 16, fontWeight: "800" },
    errorText: { color: colors.fat, fontSize: 13 },
  });
