import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { colors } from "../../src/theme/colors";

/** Icona tab leggera via emoji (niente dipendenza icon esterna). */
function TabIcon({ emoji, color, size }: { emoji: string; color: ColorValue; size: number }) {
  return <Text style={{ fontSize: size - 2, color }}>{emoji}</Text>;
}

/**
 * Navigazione principale a Bottom Tabs. Per la Fase 2: Oggi (Dashboard) e Storico.
 * Le tab di Diario/Scanner/Profilo si aggiungeranno nelle fasi successive.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.calories,
        tabBarInactiveTintColor: colors.textMuted,
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
