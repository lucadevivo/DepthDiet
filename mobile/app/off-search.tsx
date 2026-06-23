import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ScreenHeader } from "../src/components/ScreenHeader";
import { OffProductRow } from "../src/components/OffProductRow";
import { useTheme, useThemed } from "../src/theme/ThemeProvider";
import type { ThemeColors } from "../src/theme/colors";
import { searchOff } from "../src/api/off";
import { useImportOff } from "../src/hooks/useImportOff";

export default function OffSearchScreen() {
  const { colors, styles } = useThemed(makeStyles);
  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { importProduct, statusOf } = useImportOff();

  const results = useQuery({
    queryKey: ["off-search", submitted],
    queryFn: () => searchOff(submitted),
    enabled: submitted.length >= 2,
  });

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Open Food Facts" />
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search a product (e.g. black beans)"
          placeholderTextColor={colors.textMuted}
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={() => setSubmitted(term.trim())}
          returnKeyType="search"
        />
        <Pressable onPress={() => setSubmitted(term.trim())} style={styles.searchBtn}>
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      <Link href="/scan" style={styles.scanLink}>
        📷 or scan a barcode
      </Link>

      {results.isFetching ? (
        <ActivityIndicator color={colors.protein} style={{ marginTop: 24 }} />
      ) : results.isError ? (
        <Text style={styles.error}>
          Open Food Facts search failed. Try again shortly.
        </Text>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={results.data ?? []}
          keyExtractor={(p, i) => `${p.barcode || "x"}-${i}`}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <OffProductRow
              product={item}
              status={statusOf(item.barcode)}
              onImport={importProduct}
            />
          )}
          ListEmptyComponent={
            submitted.length >= 2 ? (
              <Text style={styles.empty}>No results.</Text>
            ) : (
              <Text style={styles.empty}>Type at least 2 characters and press Search.</Text>
            )
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  searchBar: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchBtn: {
    backgroundColor: colors.protein,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "800" },
  scanLink: { color: colors.water, fontSize: 14, fontWeight: "700", paddingHorizontal: 16, paddingVertical: 6 },
  list: { padding: 16 },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 24 },
  error: { color: colors.fat, fontSize: 14, textAlign: "center", marginTop: 24, paddingHorizontal: 16 },
});
