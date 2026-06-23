import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import type { OffProduct } from "../types/food";

export type ImportStatus = "idle" | "pending" | "done" | "duplicate" | "error";

interface Props {
  product: OffProduct;
  status: ImportStatus;
  onImport: (p: OffProduct) => void;
}

/** Riga prodotto Open Food Facts con pulsante "Importa" come Alimento Personale. */
export function OffProductRow({ product, status, onImport }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>
          {product.name}
          {product.brand ? <Text style={styles.brand}> · {product.brand}</Text> : null}
        </Text>
        <Text style={styles.meta}>
          {product.kcal_per_100} kcal · P {product.protein_per_100} C {product.carbs_per_100} G{" "}
          {product.fat_per_100} /100g
        </Text>
      </View>
      <ImportButton status={status} onPress={() => onImport(product)} />
    </View>
  );
}

function ImportButton({ status, onPress }: { status: ImportStatus; onPress: () => void }) {
  if (status === "pending") return <ActivityIndicator color={colors.protein} />;
  if (status === "done") return <Text style={[styles.tag, { color: colors.calories }]}>✓ Importato</Text>;
  if (status === "duplicate") return <Text style={[styles.tag, { color: colors.textMuted }]}>Già presente</Text>;
  return (
    <Pressable onPress={onPress} style={styles.btn}>
      <Text style={styles.btnText}>{status === "error" ? "Riprova" : "Importa"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { color: colors.text, fontSize: 14, fontWeight: "700" },
  brand: { color: colors.textMuted, fontWeight: "500" },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  btn: { backgroundColor: colors.protein, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  tag: { fontSize: 12, fontWeight: "700" },
});
