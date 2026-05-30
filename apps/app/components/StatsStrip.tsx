import { StyleSheet, Text, View, useColorScheme } from "react-native";
import type { Stats } from "@/lib/api";
import { palette } from "@/lib/theme";

/** Pure awareness strip (3 counters). Decoupled from fetching, so it renders
 *  deterministically and is unit-testable without async. */
export function StatsStrip({ stats }: { stats: Stats }) {
  const c = palette(useColorScheme() === "dark");
  const tiles = [
    { value: stats.checks, label: "Checks" },
    { value: stats.reports, label: "Reports" },
    { value: stats.confirmedScams, label: "Confirmed" },
  ];
  return (
    <View testID="stats-strip" style={[styles.strip, { backgroundColor: c.surface, borderColor: c.border }]}>
      {tiles.map((t) => (
        <View key={t.label} style={styles.tile}>
          <Text style={[styles.value, { color: c.text }]}>{format(t.value)}</Text>
          <Text style={[styles.label, { color: c.textMuted }]}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

function format(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", borderRadius: 16, borderWidth: 1, paddingVertical: 14 },
  tile: { flex: 1, alignItems: "center" },
  value: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 11, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 },
});
