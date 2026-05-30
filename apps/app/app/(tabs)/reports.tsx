import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { palette } from "@/lib/theme";

export default function ReportsScreen() {
  const dark = useColorScheme() === "dark";
  const c = palette(dark);
  return (
    <Screen>
      <Text style={[styles.title, { color: c.text }]}>My reports</Text>
      <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
        <MaterialCommunityIcons name="flag-outline" size={32} color={c.textMuted} />
        <Text style={[styles.emptyText, { color: c.textMuted }]}>
          Reports you submit will appear here with their status.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: "700" },
  empty: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    gap: 12,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
