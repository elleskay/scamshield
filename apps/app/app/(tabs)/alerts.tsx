import { useEffect, useState } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { AlertList } from "@/components/AlertList";
import { listAlerts, type Alert } from "@/lib/api";
import { palette } from "@/lib/theme";

export default function AlertsScreen() {
  const dark = useColorScheme() === "dark";
  const c = palette(dark);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    let active = true;
    void listAlerts().then((a) => {
      if (active) setAlerts(a);
    });
    return () => {
      active = false;
    };
  }, []);

  const hasAlerts = alerts && alerts.length > 0;

  return (
    <Screen>
      <Text style={[styles.title, { color: c.text }]}>Scam alerts</Text>

      {hasAlerts ? (
        <AlertList alerts={alerts} />
      ) : (
        <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
          <MaterialCommunityIcons name="bell-outline" size={32} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Advisories about emerging scams will appear here.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: "700" },
  empty: { borderRadius: 20, borderWidth: 1, padding: 28, gap: 12, alignItems: "center" },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
