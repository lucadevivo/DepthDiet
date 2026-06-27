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
import { useI18n } from "../src/i18n";
import { apiFetch } from "../src/api/client";
import { queryClient } from "../src/api/queryClient";
import { SECRET_KEYS, getSecret, setSecret, deleteSecret } from "../src/lib/secureStore";

type TestState = "idle" | "testing" | "ok" | "fail";

export default function SetupScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const { t } = useI18n();
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

      // Le credenziali sono cambiate: rilancia le query che potrebbero essere in
      // errore (es. il Diary aperto all'avvio prima che il token fosse impostato),
      // così l'app si riprende senza dover riavviare.
      await queryClient.invalidateQueries();

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
        <ScreenHeader title={t("settings.credentials")} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t("settings.credentials")} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t("setup.lead")}</Text>

        <Text style={styles.label}>{t("setup.bearer")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("setup.pasteToken")}
          placeholderTextColor={colors.textMuted}
          value={bearer}
          onChangeText={setBearer}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <Text style={styles.section}>{t("setup.cfSection")}</Text>
        <Text style={styles.label}>CF-Access-Client-Id</Text>
        <TextInput
          style={styles.input}
          placeholder={t("setup.cfEmptyDev")}
          placeholderTextColor={colors.textMuted}
          value={cfId}
          onChangeText={setCfId}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.label}>CF-Access-Client-Secret</Text>
        <TextInput
          style={styles.input}
          placeholder={t("setup.cfEmptyDev")}
          placeholderTextColor={colors.textMuted}
          value={cfSecret}
          onChangeText={setCfSecret}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />

        <Pressable style={[styles.primaryBtn, saving && styles.disabled]} disabled={saving} onPress={onSave}>
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>{t("setup.saveCreds")}</Text>}
        </Pressable>
        {saved ? <Text style={styles.ok}>{t("setup.savedKeychain")}</Text> : null}

        <Pressable style={styles.secondaryBtn} onPress={onTest}>
          {test === "testing" ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.secondaryText}>{t("setup.testConnection")}</Text>
          )}
        </Pressable>
        {test === "ok" ? <Text style={styles.ok}>{t("setup.testOk")}</Text> : null}
        {test === "fail" ? (
          <Text style={styles.error}>{t("setup.testFail")}</Text>
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
