import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { checkMessage, submitReport, type CheckResult } from "@/lib/api";
import { brand, palette, severity } from "@/lib/theme";

export default function CheckScreen() {
  const dark = useColorScheme() === "dark";
  const c = palette(dark);

  const [text, setText] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Entrance animation for the verdict card.
  const reveal = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    reveal.setValue(0);
    if (result) {
      Animated.spring(reveal, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    }
  }, [result, reveal]);

  async function onCheck() {
    setBusy(true);
    setReportId(null);
    try {
      setResult(await checkMessage(text));
    } finally {
      setBusy(false);
    }
  }

  async function onReport() {
    setBusy(true);
    try {
      const receipt = await submitReport(text);
      setReportId(receipt.reportId);
    } finally {
      setBusy(false);
    }
  }

  const flagged = result !== null && result.verdict !== "clean";
  const sev = result ? severity[result.verdict] : null;
  const canCheck = !!text && !busy;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient
        colors={[brand.indigo, brand.violet]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroRow}>
            <View style={styles.logo}>
              <MaterialCommunityIcons name="shield-check" size={26} color="#fff" />
            </View>
            <View>
              <Text style={styles.brandName}>ScamShield</Text>
              <Text style={styles.tagline}>Check. Report. Stay safe.</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Check a message</Text>
          <Text style={[styles.cardHint, { color: c.textMuted }]}>
            Paste a suspicious SMS, message, or link and we will assess it.
          </Text>

          <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
            <MaterialCommunityIcons
              name="message-text-outline"
              size={20}
              color={c.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              testID="message-input"
              style={[styles.input, { color: c.text }]}
              placeholder="e.g. Verify your bank account at..."
              placeholderTextColor={c.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>

          <CheckButton
            testID="check-button"
            disabled={!canCheck}
            busy={busy}
            onPress={() => void onCheck()}
          />
        </View>

        {result && sev && (
          <Animated.View
            testID="verdict"
            style={[
              styles.card,
              styles.verdictCard,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderLeftColor: sev.color,
                opacity: reveal,
                transform: [
                  { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                ],
              },
            ]}
          >
            <View style={styles.verdictHead}>
              <View style={[styles.badge, { backgroundColor: sev.bg }]}>
                <MaterialCommunityIcons name={sev.icon as never} size={28} color={sev.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verdictLabel, { color: sev.color }]}>{sev.label}</Text>
                <Text style={[styles.verdictReason, { color: c.textMuted }]}>{result.reason}</Text>
              </View>
            </View>

            <Text style={[styles.meterLabel, { color: c.textMuted }]}>
              Risk {Math.round(result.score * 100)}%
            </Text>
            <View style={[styles.meterTrack, { backgroundColor: c.surfaceAlt }]}>
              <View
                style={[
                  styles.meterFill,
                  { width: `${Math.round(result.score * 100)}%`, backgroundColor: sev.color },
                ]}
              />
            </View>
          </Animated.View>
        )}

        {flagged && sev && !reportId && (
          <Pressable
            testID="report-button"
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void onReport()}
            style={({ pressed }) => [
              styles.reportBtn,
              { backgroundColor: sev.color, opacity: busy ? 0.6 : pressed ? 0.9 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="flag-outline" size={20} color="#fff" />
            <Text style={styles.reportBtnText}>Report this scam</Text>
          </Pressable>
        )}

        {reportId && (
          <View
            testID="report-confirmation"
            style={[styles.successCard, { borderColor: "#A7F3D0" }]}
          >
            <View style={styles.successHead}>
              <MaterialCommunityIcons name="check-circle" size={26} color="#059669" />
              <Text style={styles.successTitle}>Report submitted. Thank you.</Text>
            </View>
            <Text style={styles.successRef}>Reference {reportId.slice(0, 8)}</Text>
            <Text style={[styles.successNote, { color: c.textMuted }]}>
              You helped protect others from this scam.
            </Text>
          </View>
        )}

        <Text style={[styles.footer, { color: c.textMuted }]}>
          Unofficial demo. Not affiliated with the official ScamShield.
        </Text>
      </ScrollView>
    </View>
  );
}

function CheckButton({
  testID,
  disabled,
  busy,
  onPress,
}: {
  testID: string;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, friction: 7 }).start();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={disabled ? ["#CBD5E1", "#94A3B8"] : [brand.indigo, brand.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cta}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="shield-search" size={20} color="#fff" />
              <Text style={styles.ctaText}>Check message</Text>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 22 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8 },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },
  tagline: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 1 },

  body: { padding: 16, gap: 16, paddingBottom: 40 },
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
  cardTitle: { fontSize: 19, fontWeight: "700" },
  cardHint: { fontSize: 14, lineHeight: 20, marginTop: -4 },
  inputWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    minHeight: 110,
  },
  inputIcon: { marginTop: 2, marginRight: 8 },
  input: { flex: 1, fontSize: 16, lineHeight: 22, textAlignVertical: "top", paddingBottom: 12 },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  verdictCard: { borderLeftWidth: 5 },
  verdictHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  verdictLabel: { fontSize: 20, fontWeight: "800", letterSpacing: 0.3 },
  verdictReason: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  meterLabel: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  meterTrack: { height: 8, borderRadius: 99, overflow: "hidden" },
  meterFill: { height: 8, borderRadius: 99 },

  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  reportBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  successCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 6,
    backgroundColor: "#ECFDF5",
  },
  successHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  successTitle: { fontSize: 16, fontWeight: "700", color: "#065F46" },
  successRef: { fontSize: 13, fontWeight: "600", color: "#047857", fontFamily: "monospace" },
  successNote: { fontSize: 13 },

  footer: { textAlign: "center", fontSize: 12, marginTop: 8 },
});
