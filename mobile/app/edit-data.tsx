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
import { useI18n } from "../src/i18n";
import { useProfileQuery, useUpdateProfile } from "../src/hooks/useProfile";
import {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "../src/types/profile";

/** Form anagrafico (peso/altezza/età, gender, goal, attività) come schermata a sé. */
export default function EditDataScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
  const router = useRouter();
  const profileQuery = useProfileQuery();
  const updateProfile = useUpdateProfile();

  // Opzioni localizzate per i selettori.
  const sexOptions = SEX_OPTIONS.map((o) => ({ value: o.value, label: t(`sex.${o.value}`) }));
  const goalOptions = GOAL_OPTIONS.map((o) => ({
    value: o.value,
    label: t(`goal.${o.value}`),
    desc: t(`goal.${o.value}.desc`),
  }));
  const activityOptions = ACTIVITY_OPTIONS.map((o) => ({
    value: o.value,
    label: t(`activity.${o.value}`),
    desc: t(`activity.${o.value}.desc`),
  }));

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
      <ScreenHeader title={t("editData.title")} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fieldRow}>
          <NumberField label={t("common.weight")} value={weight} onChangeText={setWeight} unit="kg" />
          <NumberField label={t("common.height")} value={height} onChangeText={setHeight} unit="cm" />
          <NumberField label={t("common.age")} value={age} onChangeText={setAge} unit="y" />
        </View>

        <Text style={styles.fieldLabel}>{t("profile.gender")}</Text>
        <SegmentedControl options={sexOptions} value={sex} onChange={setSex} />

        <LabelWithInfo label={t("profile.goalLabel")} onInfo={() => setInfo("goal")} styles={styles} colors={colors} />
        <OptionList options={goalOptions} value={goal} onChange={setGoal} />

        <LabelWithInfo
          label={t("profile.activityLabel")}
          onInfo={() => setInfo("activity")}
          styles={styles}
          colors={colors}
        />
        <OptionList options={activityOptions} value={activity} onChange={setActivity} />

        <Pressable
          onPress={onSave}
          disabled={!valid || updateProfile.isPending}
          style={[styles.saveBtn, (!valid || updateProfile.isPending) && styles.saveBtnDisabled]}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.saveText}>{t("editData.save")}</Text>
          )}
        </Pressable>

        {updateProfile.isError ? (
          <Text style={styles.errorText}>{t("editData.saveError")}</Text>
        ) : null}
      </ScrollView>

      <Modal visible={info != null} transparent animationType="fade" onRequestClose={() => setInfo(null)}>
        <Pressable style={styles.infoBackdrop} onPress={() => setInfo(null)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <Text style={styles.infoTitle}>
              {info === "goal" ? t("profile.goalLabel") : info === "activity" ? t("profile.activityLabel") : ""}
            </Text>
            <Text style={styles.infoText}>
              {info === "goal" ? t("editData.goalInfo") : info === "activity" ? t("editData.activityInfo") : ""}
            </Text>
            <Pressable style={styles.infoBtn} onPress={() => setInfo(null)}>
              <Text style={styles.infoBtnText}>{t("common.gotIt")}</Text>
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
