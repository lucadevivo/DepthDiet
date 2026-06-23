import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../../src/theme/colors";
import { Icon, type IconName } from "../../src/components/Icon";

interface RowProps {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
}

function SettingsRow({ icon, label, value, onPress }: RowProps) {
  const Container: typeof Pressable | typeof View = onPress ? Pressable : View;
  return (
    <Container style={styles.row} {...(onPress ? { onPress } : {})}>
      <Icon name={icon} size={20} color={colors.primary} />
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress ? <Icon name="chevron" size={16} color={colors.textMuted} /> : null}
    </Container>
  );
}

/**
 * Settings (stile "Macros"). Scaffold di F1: la scelta formula, lo switch tema
 * dark/light/system e il sistema di tema arrivano in F4. Le credenziali rimandano
 * alla schermata setup esistente.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <Text style={styles.heading}>Settings</Text>

      <Text style={styles.group}>Calculation</Text>
      <View style={styles.card}>
        <SettingsRow icon="bmi" label="Formula" value="Mifflin-St Jeor" />
      </View>

      <Text style={styles.group}>Appearance</Text>
      <View style={styles.card}>
        <SettingsRow icon="settings" label="Theme" value="System" />
      </View>

      <Text style={styles.group}>Account</Text>
      <View style={styles.card}>
        <SettingsRow
          icon="settings"
          label="Credentials & connection"
          onPress={() => router.push("/setup")}
        />
      </View>

      <Text style={styles.note}>Formula choice and theme switching are coming soon.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 8, paddingBottom: 40 },
  heading: { color: colors.text, fontSize: 28, fontWeight: "800", marginBottom: 8 },
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
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: "600", flex: 1 },
  rowValue: { color: colors.textMuted, fontSize: 14 },
  note: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 16 },
});
