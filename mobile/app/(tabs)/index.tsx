import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalorieSummary } from "../../src/components/CalorieSummary";
import { MacroBar } from "../../src/components/MacroBar";
import { WaterCounter } from "../../src/components/WaterCounter";
import { colors } from "../../src/theme/colors";
import { todayISO } from "../../src/lib/date";
import { useDiaryQuery } from "../../src/hooks/useDiary";
import { useProfileQuery } from "../../src/hooks/useProfile";

// Obiettivi di fallback se il profilo non è ancora stato calcolato (Fase 3a).
const FALLBACK_TARGETS = { calories: 2600, protein_g: 190, carbs_g: 270, fat_g: 75 };

/**
 * Dashboard Giornaliera — ora collegata ai dati REALI (Fase 3b):
 * totali dal diario di oggi, obiettivi dal profilo. L'acqua resta su Zustand
 * (il backend acqua arriverà più avanti).
 */
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const date = todayISO();
  const diary = useDiaryQuery(date);
  const profile = useProfileQuery();

  const totals = diary.data?.totals ?? { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  const p = profile.data;
  const targets = {
    calories: p?.target_calories ?? FALLBACK_TARGETS.calories,
    protein_g: p?.target_protein_g ?? FALLBACK_TARGETS.protein_g,
    carbs_g: p?.target_carbs_g ?? FALLBACK_TARGETS.carbs_g,
    fat_g: p?.target_fat_g ?? FALLBACK_TARGETS.fat_g,
  };
  const waterTarget = p?.water_target_ml ?? 2500;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <Text style={styles.heading}>Dashboard</Text>

      {diary.isLoading ? (
        <ActivityIndicator color={colors.protein} style={{ marginTop: 24 }} />
      ) : (
        <>
          {diary.isError ? (
            <Text style={styles.error}>
              Backend non raggiungibile: configura URL e credenziali. Mostro 0.
            </Text>
          ) : null}

          <CalorieSummary consumed={totals.kcal} target={targets.calories} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Macronutrienti</Text>
            {/* Proteine enfatizzate: utente che fa pesistica e le monitora. */}
            <MacroBar
              label="Proteine"
              current={totals.protein_g}
              target={targets.protein_g}
              color={colors.protein}
              emphasized
            />
            <MacroBar
              label="Carboidrati"
              current={totals.carbs_g}
              target={targets.carbs_g}
              color={colors.carbs}
            />
            <MacroBar label="Grassi" current={totals.fat_g} target={targets.fat_g} color={colors.fat} />
          </View>

          <WaterCounter targetMl={waterTarget} />

          {p?.target_calories == null ? (
            <Text style={styles.note}>
              Imposta i tuoi obiettivi nella tab Profilo per target personalizzati.
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 18, paddingBottom: 40 },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800" },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  note: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  error: { color: colors.fat, fontSize: 12, textAlign: "center" },
});
