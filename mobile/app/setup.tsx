import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { useTheme, useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { apiFetch } from "../src/api/client";
import { SECRET_KEYS, getSecret, setSecret, deleteSecret } from "../src/lib/secureStore";

type TestState = "idle" | "testing" | "ok" | "fail";

export default function SetupScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const [bearer, setBearer] = useState("");
  const [cfId, setCfId] = useState("");
  const [cfSecret, setCfSecret] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<TestState>("idle");

  // Carica i valori già salvati nel Keychain.
  useEffect(() => {
    (async () => {
      const [b, id, sec] = await Promise.all([
        getSecret(SECRET_KEYS.appBearerToken),
        getSecret(SECRET_KEYS.cfAccessClientId),
        getSecret(SECRET_KEYS.cfAccessClientSecret),
      ]);
      if (b) setBearer(b);
      if (id) setCfId(id);
      if (sec) setCfSecret(sec);
      setLoaded(true);
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setSaved(false);
    setTest("idle");
    try {
      const b = bearer.trim();
      if (b) await setSecret(SECRET_KEYS.appBearerToken, b);
      else await deleteSecret(SECRET_KEYS.appBearerToken);

      const id = cfId.trim();
      if (id) await setSecret(SECRET_KEYS.cfAccessClientId, id);
      else await deleteSecret(SECRET_KEYS.cfAccessClientId);

      const sec = cfSecret.trim();
      if (sec) await setSecret(SECRET_KEYS.cfAccessClientSecret, sec);
      else await deleteSecret(SECRET_KEYS.cfAccessClientSecret);

      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTest("testing");
    try {
      await apiFetch("/api/ping");
      setTest("ok");
    } catch {
      setTest("fail");
    }
  };

  if (!loaded) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Settings" />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Settings" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          Backend access credentials. They stay in the phone Keychain, never in the bundle.
        </Text>

        <Text style={styles.label}>Bearer token (required)</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste APP_BEARER_TOKEN"
          placeholderTextColor={colors.textMuted}
          value={bearer}
          onChangeText={setBearer}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <Text style={styles.section}>Cloudflare Access (optional, production only)</Text>
        <Text style={styles.label}>CF-Access-Client-Id</Text>
        <TextInput
          style={styles.input}
          placeholder="Leave empty in dev"
          placeholderTextColor={colors.textMuted}
          value={cfId}
          onChangeText={setCfId}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.label}>CF-Access-Client-Secret</Text>
        <TextInput
          style={styles.input}
          placeholder="Leave empty in dev"
          placeholderTextColor={colors.textMuted}
          value={cfSecret}
          onChangeText={setCfSecret}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <Pressable style={[styles.primaryBtn, saving && styles.disabled]} disabled={saving} onPress={onSave}>
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>Save credentials</Text>}
        </Pressable>
        {saved ? <Text style={styles.ok}>✓ Saved to Keychain.</Text> : null}

        <Pressable style={styles.secondaryBtn} onPress={onTest}>
          {test === "testing" ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.secondaryText}>Test connection</Text>
          )}
        </Pressable>
        {test === "ok" ? <Text style={styles.ok}>✓ Backend reachable and authentication ok.</Text> : null}
        {test === "fail" ? (
          <Text style={styles.error}>
            Connection failed. Check the token, that the backend is running and you are on the same network.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 60 },
  lead: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  section: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 14, textTransform: "uppercase" },
  label: { color: colors.text, fontSize: 14, fontWeight: "700", marginTop: 6 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryBtn: {
    backgroundColor: colors.calories,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  primaryText: { color: "#06210f", fontSize: 16, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  ok: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  error: { color: colors.fat, fontSize: 14 },
});
