import { ScrollView, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../src/theme/colors";
import { useProfileQuery } from "../../src/hooks/useProfile";
import { MacroSplitBar } from "../../src/components/MacroSplitBar";
import { MetricCard } from "../../src/components/MetricCard";

/**
 * Goals (stile "Macros"): daily caloric requirement + distribuzione macro.
 * Scaffold di F1 — il selettore preset dieta + grafico a torta arriva in F2.
 */
export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfileQuery();
  const p = profile.data;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <Text style={styles.heading}>Goals</Text>

      {profile.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <>
          <MetricCard
            icon="calories"
            iconColor={colors.primary}
            label="Daily caloric requirement"
            value={p?.target_calories != null ? `${p.target_calories} kcal` : "Set up in Profile"}
          />

          {p?.target_calories != null ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Macronutrients</Text>
              <MacroSplitBar
                protein_g={p.target_protein_g ?? 0}
                carbs_g={p.target_carbs_g ?? 0}
                fat_g={p.target_fat_g ?? 0}
              />
              <Text style={styles.note}>
                Diet presets (Standard, Balanced, Low fat, High protein, Keto, Custom) and the pie
                chart are coming next.
              </Text>
            </View>
          ) : (
            <Text style={styles.note}>
              Set your stats in the Profile tab to compute your goals.
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
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
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
});
