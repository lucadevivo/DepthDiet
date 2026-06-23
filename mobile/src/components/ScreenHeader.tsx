import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors } from "../theme/colors";

/** Header con freccia indietro per le schermate fuori dalle tab (stack). */
export function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  back: { paddingRight: 4 },
  backText: { color: colors.protein, fontSize: 34, lineHeight: 34, fontWeight: "400" },
  title: { color: colors.text, fontSize: 22, fontWeight: "800" },
});
