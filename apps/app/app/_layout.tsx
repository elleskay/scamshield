import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, useColorScheme } from "react-native";
import { palette } from "@/lib/theme";

/**
 * Root layout. Constrains the whole app to a centered phone-width column so the
 * browser demo renders like a real phone instead of stretching edge-to-edge on
 * desktop. No-op on actual devices (already narrower than maxWidth).
 */
export default function RootLayout() {
  const dark = useColorScheme() === "dark";
  const c = palette(dark);
  return (
    <View style={[styles.page, { backgroundColor: c.border }]}>
      <View style={[styles.device, { backgroundColor: c.bg }]}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center" },
  device: { flex: 1, width: "100%", maxWidth: 480, overflow: "hidden" },
});
