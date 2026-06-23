import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Icon, type IconName } from "../../src/components/Icon";

/** Icona della tab bar: usa il set Icon col colore (attivo/inattivo) di expo-router. */
function TabBarIcon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  return <Icon name={name} color={color} size={size} />;
}

/**
 * Navigazione principale a Bottom Tabs (stile "Macros"): sfondo dark, tab attiva
 * in rosso. Niente header di sistema — ogni schermata disegna il proprio header.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
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
          title: "Diary",
          tabBarIcon: ({ color, size }) => <TabBarIcon name="diary" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <TabBarIcon name="profile" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goals",
          tabBarIcon: ({ color, size }) => <TabBarIcon name="goals" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <TabBarIcon name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
