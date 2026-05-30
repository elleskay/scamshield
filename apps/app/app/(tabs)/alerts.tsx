import { useEffect, useState } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { listAlerts, type Alert } from "@/lib/api";
import { brand, palette } from "@/lib/theme";

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
        alerts.map((a) => (
          <View
            key={a.id}
            testID="alert-card"
            style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <View style={styles.cardHead}>
              <View style={[styles.chip, { backgroundColor: c.surfaceAlt }]}>
                <MaterialCommunityIcons name="alert-decagram-outline" size={14} color={brand.indigo} />
                <Text style={[styles.chipText, { color: brand.indigo }]}>{a.category}</Text>
              </View>
              <Text style={[styles.date, { color: c.textMuted }]}>{formatDate(a.date)}</Text>
            </View>
            <Text style={[styles.cardTitle, { color: c.text }]}>{a.title}</Text>
            <Text style={[styles.cardBody, { color: c.textMuted }]}>{a.body}</Text>
          </View>
        ))
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: "700" },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  date: { fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardBody: { fontSize: 14, lineHeight: 20 },
  empty: { borderRadius: 20, borderWidth: 1, padding: 28, gap: 12, alignItems: "center" },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
