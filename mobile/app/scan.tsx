import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { OffProductRow } from "../src/components/OffProductRow";
import { useTheme, useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { lookupBarcode } from "../src/api/off";
import { useImportOff } from "../src/hooks/useImportOff";

export default function ScanScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [code, setCode] = useState<string | null>(null);
  const { importProduct, statusOf } = useImportOff();

  const lookup = useQuery({
    queryKey: ["off-barcode", code],
    queryFn: () => lookupBarcode(code!),
    enabled: !!code,
  });

  const onScan = (result: BarcodeScanningResult) => {
    if (!code) setCode(result.data); // scansiona una sola volta finché non si resetta
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Scansiona barcode" />

      {!permission ? (
        <ActivityIndicator color={colors.protein} style={{ marginTop: 24 }} />
      ) : !permission.granted ? (
        <View style={styles.center}>
          <Text style={styles.info}>Serve il permesso fotocamera per scansionare i prodotti.</Text>
          <Pressable onPress={requestPermission} style={styles.btn}>
            <Text style={styles.btnText}>Consenti fotocamera</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.cameraBox}>
            {code ? (
              <View style={styles.cameraPlaceholder}>
                <Text style={styles.code}>Codice: {code}</Text>
              </View>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{
                  barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
                }}
                onBarcodeScanned={onScan}
              />
            )}
          </View>

          <View style={styles.result}>
            {!code ? (
              <Text style={styles.hint}>Inquadra il codice a barre del prodotto.</Text>
            ) : lookup.isLoading ? (
              <ActivityIndicator color={colors.protein} />
            ) : lookup.isError ? (
              <Text style={styles.error}>Errore di rete durante il lookup. Riprova.</Text>
            ) : lookup.data ? (
              <OffProductRow
                product={lookup.data}
                status={statusOf(lookup.data.barcode)}
                onImport={importProduct}
              />
            ) : (
              <View style={{ gap: 8 }}>
                <Text style={styles.info}>Prodotto non trovato su Open Food Facts.</Text>
                <Link href="/foods" style={styles.link}>
                  Inseriscilo manualmente negli Alimenti →
                </Link>
              </View>
            )}

            {code ? (
              <Pressable onPress={() => setCode(null)} style={[styles.btn, styles.again]}>
                <Text style={styles.btnText}>Scansiona di nuovo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  cameraBox: {
    height: 300,
    margin: 16,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cameraPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  code: { color: colors.text, fontSize: 16, fontWeight: "700" },
  result: { paddingHorizontal: 16, gap: 12 },
  hint: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  info: { color: colors.text, fontSize: 14, textAlign: "center" },
  link: { color: colors.water, fontSize: 14, fontWeight: "700", textAlign: "center" },
  btn: {
    backgroundColor: colors.protein,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  again: { backgroundColor: colors.surfaceAlt },
  btnText: { color: "#fff", fontWeight: "800" },
  error: { color: colors.fat, fontSize: 14, textAlign: "center" },
});
