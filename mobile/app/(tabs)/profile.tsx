import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { colors } from "../../src/theme/colors";
import { NumberField } from "../../src/components/NumberField";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { useProfileQuery, useUpdateProfile } from "../../src/hooks/useProfile";
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
    updateProfile.mutate({
      weight_kg: w,
      height_cm: h,
      age: a,
      sex,
      activity_level: activity,
      goal,
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Text style={styles.heading}>Calcolatore obiettivi</Text>
        <View style={styles.headerLinks}>
          <Link href="/weight" style={styles.weightLink}>
            ⚖️ Peso
          </Link>
          <Link href="/setup" style={styles.weightLink}>
            ⚙️ Impostazioni
          </Link>
        </View>
      </View>

      {profileQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.protein} />
        </View>
      ) : profileQuery.isError ? (
        <ErrorBox onRetry={() => profileQuery.refetch()} />
      ) : (
        <>
          <TargetsCard profile={profileQuery.data} />

          <View style={styles.formCard}>
            <View style={styles.fieldRow}>
              <NumberField label="Peso" value={weight} onChangeText={setWeight} unit="kg" />
              <NumberField label="Altezza" value={height} onChangeText={setHeight} unit="cm" />
              <NumberField label="Età" value={age} onChangeText={setAge} unit="anni" />
            </View>

            <Label text="Sesso" />
            <SegmentedControl options={SEX_OPTIONS} value={sex} onChange={setSex} />

            <Label text="Obiettivo" />
            <SegmentedControl options={GOAL_OPTIONS} value={goal} onChange={setGoal} />

            <Label text="Livello di attività" />
            <View style={{ gap: 8 }}>
              {ACTIVITY_OPTIONS.map((opt) => {
                const active = opt.value === activity;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setActivity(opt.value)}
                    style={[styles.activityRow, active && styles.activityRowActive]}
                  >
                    <View>
                      <Text style={[styles.activityLabel, active && styles.activityLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.activityDesc}>{opt.desc}</Text>
                    </View>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={onSave}
              disabled={!valid || updateProfile.isPending}
              style={[styles.saveBtn, (!valid || updateProfile.isPending) && styles.saveBtnDisabled]}
            >
              {updateProfile.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Calcola e salva obiettivi</Text>
              )}
            </Pressable>

            {updateProfile.isError ? (
              <Text style={styles.errorText}>
                Errore nel salvataggio. Controlla connessione/credenziali e riprova.
              </Text>
            ) : null}
            {updateProfile.isSuccess ? (
              <Text style={styles.successText}>
                Obiettivi aggiornati — BMR {updateProfile.data.computation.bmr} · TDEE{" "}
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
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function TargetsCard({ profile }: { profile: Profile | undefined }) {
  if (!profile || profile.target_calories == null) {
    return (
      <View style={styles.targetsCard}>
        <Text style={styles.targetsEmpty}>
          Nessun obiettivo impostato. Compila i dati qui sotto e calcola.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.targetsCard}>
      <Text style={styles.targetsKicker}>OBIETTIVI ATTUALI</Text>
      <Text style={styles.targetsCalories}>{profile.target_calories} kcal</Text>
      <View style={styles.targetsMacros}>
        <Macro label="Proteine" value={profile.target_protein_g} color={colors.protein} />
        <Macro label="Carbo" value={profile.target_carbs_g} color={colors.carbs} />
        <Macro label="Grassi" value={profile.target_fat_g} color={colors.fat} />
      </View>
    </View>
  );
}

function Macro({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <View style={styles.macroBox}>
      <Text style={[styles.macroValue, { color }]}>{value ?? "—"} g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function ErrorBox({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.targetsCard}>
      <Text style={styles.errorText}>
        Impossibile caricare il profilo. Verifica che il backend sia raggiungibile e che le
        credenziali siano configurate.
      </Text>
      <Pressable onPress={onRetry} style={styles.retryBtn}>
        <Text style={styles.saveText}>Riprova</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLinks: { flexDirection: "row", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" },
  weightLink: { color: colors.water, fontSize: 15, fontWeight: "700" },
  center: { paddingVertical: 40, alignItems: "center" },

  targetsCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetsKicker: { color: colors.textMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  targetsCalories: { color: colors.calories, fontSize: 32, fontWeight: "800" },
  targetsEmpty: { color: colors.textMuted, fontSize: 14 },
  targetsMacros: { flexDirection: "row", gap: 12 },
  macroBox: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12, gap: 4 },
  macroValue: { fontSize: 18, fontWeight: "800" },
  macroLabel: { color: colors.textMuted, fontSize: 12 },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 4 },

  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityRowActive: { borderColor: colors.protein },
  activityLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
  activityLabelActive: { color: colors.protein },
  activityDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  check: { color: colors.protein, fontSize: 18, fontWeight: "800" },

  saveBtn: {
    backgroundColor: colors.calories,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: "#06210f", fontSize: 16, fontWeight: "800" },
  retryBtn: {
    backgroundColor: colors.protein,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  errorText: { color: colors.fat, fontSize: 13 },
  successText: { color: colors.calories, fontSize: 13, fontWeight: "600" },
});
