import { useCallback, useState } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { getDeviceToken } from "@/lib/device";
import { listReports, type ReportStatus, type ReportSummary } from "@/lib/api";
import { palette } from "@/lib/theme";

const STATUS_META: Record<ReportStatus, { label: string; color: string; icon: string }> = {
  pending: { label: "Under review", color: "#64748B", icon: "clock-outline" },
  scam: { label: "Scam", color: "#DC2626", icon: "alert-octagon" },
  suspicious: { label: "Suspicious", color: "#D97706", icon: "alert" },
  clean: { label: "Clean", color: "#059669", icon: "shield-check" },
};

export default function ReportsScreen() {
  const dark = useColorScheme() === "dark";
  const c = palette(dark);
  const [reports, setReports] = useState<ReportSummary[] | null>(null);

  const load = useCallback(async () => {
    const token = await getDeviceToken();
    setReports(await listReports(token));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const hasReports = reports && reports.length > 0;

  return (
    <Screen>
      <Text style={[styles.title, { color: c.text }]}>My reports</Text>

      {hasReports ? (
        reports.map((r) => {
          const m = STATUS_META[r.status];
          return (
            <View
              key={r.reportId}
              testID="report-row"
              style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <View style={[styles.statusIcon, { backgroundColor: `${m.color}1A` }]}>
                <MaterialCommunityIcons name={m.icon as never} size={20} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.snippet, { color: c.text }]} numberOfLines={1}>
                  {r.snippet}
                </Text>
                <Text style={[styles.meta, { color: c.textMuted }]}>
                  {formatDate(r.createdAt)} · {r.channel ?? "message"}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: `${m.color}1A` }]}>
                <Text style={[styles.badgeText, { color: m.color }]}>{m.label}</Text>
              </View>
            </View>
          );
        })
      ) : (
        <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
          <MaterialCommunityIcons name="flag-outline" size={32} color={c.textMuted} />
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Reports you submit will appear here with their status. You are notified when authorities
            confirm one as a scam.
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  statusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  snippet: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  empty: { borderRadius: 20, borderWidth: 1, padding: 28, gap: 12, alignItems: "center" },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
