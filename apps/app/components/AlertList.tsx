import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Alert } from "@/lib/api";
import { brand, palette } from "@/lib/theme";

/** Presentational advisory list. Pure (no fetching), so it renders deterministically
 *  and is unit-testable without async. The Alerts screen feeds it fetched data. */
export function AlertList({ alerts }: { alerts: Alert[] }) {
  const dark = useColorScheme() === "dark";
  const c = palette(dark);

  return (
    <>
      {alerts.map((a) => (
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
      ))}
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
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
});
