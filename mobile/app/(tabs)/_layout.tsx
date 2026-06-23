import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { colors } from "../../src/theme/colors";

/** Icona tab leggera via emoji (niente dipendenza icon esterna). */
function TabIcon({ emoji, color, size }: { emoji: string; color: ColorValue; size: number }) {
  return <Text style={{ fontSize: size - 2, color }}>{emoji}</Text>;
}

/**
 * Navigazione principale a Bottom Tabs (stile "Macros"): sfondo dark, tab attiva
 * in rosso. Niente header di sistema — ogni schermata disegna il proprio header.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Oggi",
          tabBarIcon: ({ color, size }) => <TabIcon emoji="📊" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: "Diario",
          tabBarIcon: ({ color, size }) => <TabIcon emoji="📒" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Storico",
          tabBarIcon: ({ color, size }) => <TabIcon emoji="🗓️" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profilo",
          tabBarIcon: ({ color, size }) => <TabIcon emoji="⚙️" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
