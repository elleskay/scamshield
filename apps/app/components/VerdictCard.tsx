import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, useColorScheme } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { palette, severity } from "@/lib/theme";
import type { Verdict } from "@/lib/classifier";

export interface VerdictCardProps {
  verdict: Verdict;
  score: number;
  reason: string;
  /** When set, render the trusted "verified caller" treatment instead. */
  verified?: { label?: string } | null;
  /** How many similar reports exist; shows a "reported N times" line when > 1. */
  reportedCount?: number;
}

/** Shared result card for both message and number checks. Animates in on mount.
 *  Always carries testID="verdict"; verified callers add testID="verified-badge". */
export function VerdictCard({ verdict, score, reason, verified, reportedCount }: VerdictCardProps) {
  const dark = useColorScheme() === "dark";
  const c = palette(dark);

  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    reveal.setValue(0);
    const anim = Animated.spring(reveal, { toValue: 1, useNativeDriver: true, friction: 7 });
    anim.start();
    return () => anim.stop();
  }, [verdict, reason, reveal]);

  const animated = {
    opacity: reveal,
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  if (verified) {
    return (
      <Animated.View
        testID="verdict"
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: "#A7F3D0", borderLeftColor: "#059669" },
          styles.leftAccent,
          animated,
        ]}
      >
        <View style={styles.head}>
          <View style={[styles.badge, { backgroundColor: "#ECFDF5" }]}>
            <MaterialCommunityIcons testID="verified-badge" name="shield-check" size={28} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: "#059669" }]}>Verified caller</Text>
            <Text style={[styles.reason, { color: c.textMuted }]}>{reason}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  const sev = severity[verdict];
  const pct = Math.round(score * 100);
  return (
    <Animated.View
      testID="verdict"
      style={[
        styles.card,
        styles.leftAccent,
        { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: sev.color },
        animated,
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: sev.bg }]}>
          <MaterialCommunityIcons name={sev.icon as never} size={28} color={sev.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: sev.color }]}>{sev.label}</Text>
          <Text style={[styles.reason, { color: c.textMuted }]}>{reason}</Text>
        </View>
      </View>

      <Text style={[styles.meterLabel, { color: c.textMuted }]}>Risk {pct}%</Text>
      <View style={[styles.meterTrack, { backgroundColor: c.surfaceAlt }]}>
        <View style={[styles.meterFill, { width: `${pct}%`, backgroundColor: sev.color }]} />
      </View>

      {reportedCount != null && reportedCount > 1 && (
        <View style={styles.reportedRow}>
          <MaterialCommunityIcons name="account-group" size={14} color={c.textMuted} />
          <Text style={[styles.reported, { color: c.textMuted }]}>
            Reported {reportedCount} times by others
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  leftAccent: { borderLeftWidth: 5 },
  head: { flexDirection: "row", alignItems: "center", gap: 14 },
  badge: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 20, fontWeight: "800", letterSpacing: 0.3 },
  reason: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  meterLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  meterTrack: { height: 8, borderRadius: 99, overflow: "hidden" },
  meterFill: { height: 8, borderRadius: 99 },
  reportedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  reported: { fontSize: 13 },
});
