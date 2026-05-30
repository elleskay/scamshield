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
  /** When set, render the trusted "verified sender" treatment (registered Sender ID). */
  trustedSender?: string | null;
  /** A known scam phone number found inside the message; shows a warning line. */
  flaggedNumber?: string | null;
  /** Human-readable signals behind the verdict; shown as a "why" list. */
  signals?: string[] | null;
  /** How many similar reports exist; shows a "reported N times" line when > 1. */
  reportedCount?: number;
}

/** Shared result card for message and number checks. Animates in on mount. Always
 *  carries testID="verdict"; verified callers add testID="verified-badge" and
 *  trusted senders add testID="verified-sender-badge". */
export function VerdictCard({
  verdict,
  score,
  reason,
  verified,
  trustedSender,
  flaggedNumber,
  signals,
  reportedCount,
}: VerdictCardProps) {
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

  if (trustedSender) {
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
            <MaterialCommunityIcons
              testID="verified-sender-badge"
              name="check-decagram"
              size={28}
              color="#059669"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: "#059669" }]}>Verified sender</Text>
            <Text style={[styles.senderName, { color: c.text }]}>{trustedSender}</Text>
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

      {flaggedNumber && (
        <View testID="flagged-number" style={[styles.flaggedRow, { backgroundColor: sev.bg }]}>
          <MaterialCommunityIcons name="phone-alert" size={15} color={sev.color} />
          <Text style={[styles.flagged, { color: sev.color }]}>
            Contains a reported scam number: {flaggedNumber}
          </Text>
        </View>
      )}

      {reportedCount != null && reportedCount > 1 && (
        <View style={styles.reportedRow}>
          <MaterialCommunityIcons name="account-group" size={14} color={c.textMuted} />
          <Text style={[styles.reported, { color: c.textMuted }]}>
            Reported {reportedCount} times by others
          </Text>
        </View>
      )}

      {signals && signals.length > 0 && (
        <View testID="signals" style={styles.signals}>
          <Text style={[styles.signalsTitle, { color: c.textMuted }]}>Why this result</Text>
          {signals.map((s) => (
            <View key={s} style={styles.signalRow}>
              <MaterialCommunityIcons name="circle-small" size={16} color={sev.color} />
              <Text style={[styles.signalText, { color: c.text }]}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {verdict === "spam" && (
        <Text style={[styles.eduNote, { color: c.textMuted }]}>
          Spam is unsolicited promotional content, not necessarily a scam. A scam tries to steal
          your money or personal details.
        </Text>
      )}

      <View style={styles.aiRow}>
        <MaterialCommunityIcons name="robot-happy-outline" size={13} color={c.textMuted} />
        <Text style={[styles.ai, { color: c.textMuted }]}>Assessed by AI</Text>
      </View>
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
  label: { fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },
  senderName: { fontSize: 15, fontWeight: "700", marginTop: 1 },
  reason: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  flaggedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  flagged: { fontSize: 13, fontWeight: "600", flex: 1 },
  meterLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  meterTrack: { height: 8, borderRadius: 99, overflow: "hidden" },
  meterFill: { height: 8, borderRadius: 99 },
  reportedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  reported: { fontSize: 13 },
  signals: { gap: 2, marginTop: 2 },
  signalsTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2, marginBottom: 2 },
  signalRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  signalText: { fontSize: 13, flex: 1 },
  eduNote: { fontSize: 12, lineHeight: 17, fontStyle: "italic", marginTop: 2 },
  aiRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  ai: { fontSize: 11, letterSpacing: 0.3 },
});
