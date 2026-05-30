import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { VerdictCard } from "@/components/VerdictCard";
import {
  checkEmail,
  checkMessage,
  checkNumber,
  getStats,
  submitReport,
  type CheckResult,
  type NumberCheckResult,
  type Stats,
} from "@/lib/api";
import { StatsStrip } from "@/components/StatsStrip";
import { WarningCard } from "@/components/WarningCard";
import { getDeviceToken } from "@/lib/device";
import { brand, palette, severity } from "@/lib/theme";

type Mode = "message" | "number" | "email";
type ActiveResult =
  | { kind: "message"; data: CheckResult }
  | { kind: "email"; data: CheckResult }
  | { kind: "number"; data: NumberCheckResult };

export default function CheckScreen() {
  const dark = useColorScheme() === "dark";
  const c = palette(dark);

  const [mode, setMode] = useState<Mode>("message");
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<ActiveResult | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    void getStats().then((s) => active && setStats(s));
    return () => {
      active = false;
    };
  }, []);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setResult(null);
    setReportId(null);
    setSender("");
  }

  async function onCheck() {
    setBusy(true);
    setReportId(null);
    try {
      if (mode === "message") {
        setResult({ kind: "message", data: await checkMessage(text, sender.trim() || undefined) });
      } else if (mode === "email") {
        setResult({ kind: "email", data: await checkEmail(email) });
      } else {
        setResult({ kind: "number", data: await checkNumber(number) });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onReport() {
    setBusy(true);
    try {
      const deviceToken = await getDeviceToken();
      const content = mode === "email" ? email : text;
      const channel = mode === "email" ? "email" : "message";
      const receipt = await submitReport(content, deviceToken, channel);
      setReportId(receipt.reportId);
    } finally {
      setBusy(false);
    }
  }

  const canCheck =
    (mode === "message" ? !!text : mode === "email" ? !!email : !!number) && !busy;
  const showIntro = !result && !reportId;
  const reportable =
    (result?.kind === "message" || result?.kind === "email") && result.data.verdict !== "clean";
  const flaggedLink =
    (result?.kind === "message" || result?.kind === "email") &&
    (result.data.verdict === "scam" || result.data.verdict === "suspicious") &&
    /https?:\/\/|\bwww\./.test(mode === "email" ? email : text);
  const verified =
    result?.kind === "number" && result.data.isVerifiedCaller
      ? { label: result.data.label }
      : null;
  const msgResult = result?.kind === "message" || result?.kind === "email" ? result.data : null;
  const reportVerdict = result && result.kind !== "number" ? result.data.verdict : null;
  const reportLabel =
    reportVerdict === "scam"
      ? "Report this scam"
      : reportVerdict === "spam"
        ? "Report this spam"
        : "Report this message";
  const reportColor = reportVerdict ? severity[reportVerdict].color : "#DC2626";

  return (
    <Screen>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.segment, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <SegmentButton
            testID="mode-message"
            icon="message-text-outline"
            label="Message"
            active={mode === "message"}
            onPress={() => switchMode("message")}
          />
          <SegmentButton
            testID="mode-number"
            icon="phone-outline"
            label="Number"
            active={mode === "number"}
            onPress={() => switchMode("number")}
          />
          <SegmentButton
            testID="mode-email"
            icon="email-outline"
            label="Email"
            active={mode === "email"}
            onPress={() => switchMode("email")}
          />
        </View>

        {mode === "number" ? (
          <>
            <Text style={[styles.cardHint, { color: c.textMuted }]}>
              Enter a phone number to see if it is a known scam or a verified caller.
            </Text>
            <View style={[styles.numberWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={20}
                color={c.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                testID="number-input"
                style={[styles.input, { color: c.text }]}
                placeholder="e.g. +65 8000 1234"
                placeholderTextColor={c.textMuted}
                value={number}
                onChangeText={setNumber}
                keyboardType="phone-pad"
                autoCorrect={false}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.cardHint, { color: c.textMuted }]}>
              {mode === "email"
                ? "Paste a suspicious email (sender and body) and we will assess it."
                : "Paste a suspicious SMS, message, or link and we will assess it."}
            </Text>
            <View style={[styles.inputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              <MaterialCommunityIcons
                name={mode === "email" ? "email-outline" : "message-text-outline"}
                size={20}
                color={c.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                testID={mode === "email" ? "email-input" : "message-input"}
                style={[styles.input, { color: c.text }]}
                placeholder={
                  mode === "email"
                    ? "e.g. From: support@paypa1.com — verify your account..."
                    : "e.g. Verify your bank account at..."
                }
                placeholderTextColor={c.textMuted}
                value={mode === "email" ? email : text}
                onChangeText={mode === "email" ? setEmail : setText}
                multiline
              />
            </View>
            {mode === "message" && (
              <View
                style={[styles.numberWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}
              >
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={c.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  testID="sender-input"
                  style={[styles.input, { color: c.text }]}
                  placeholder="Sender ID (optional), e.g. CPF"
                  placeholderTextColor={c.textMuted}
                  value={sender}
                  onChangeText={setSender}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            )}
          </>
        )}

        <CheckButton
          testID="check-button"
          label={mode === "message" ? "Check message" : mode === "email" ? "Check email" : "Check number"}
          disabled={!canCheck}
          busy={busy}
          onPress={() => void onCheck()}
        />
      </View>

      {showIntro && stats && <StatsStrip stats={stats} />}

      {showIntro && (
        <View style={styles.steps}>
          {STEPS.map((s) => (
            <View key={s.title} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <MaterialCommunityIcons name={s.icon as never} size={20} color={brand.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: c.text }]}>{s.title}</Text>
                <Text style={[styles.stepBody, { color: c.textMuted }]}>{s.body}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {result && (
        <VerdictCard
          verdict={result.data.verdict}
          score={result.data.score}
          reason={result.data.reason}
          verified={verified}
          trustedSender={msgResult?.trustedSender}
          flaggedNumber={msgResult?.flaggedNumber}
          reportedCount={result.kind === "number" ? undefined : result.data.reportedCount}
        />
      )}

      {flaggedLink && <WarningCard />}

      {reportable && !reportId && (
        <Pressable
          testID="report-button"
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void onReport()}
          style={({ pressed }) => [
            styles.reportBtn,
            { backgroundColor: reportColor, opacity: busy ? 0.6 : pressed ? 0.9 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="flag-outline" size={20} color="#fff" />
          <Text style={styles.reportBtnText}>{reportLabel}</Text>
        </Pressable>
      )}

      {reportId && (
        <View testID="report-confirmation" style={[styles.successCard, { borderColor: "#A7F3D0" }]}>
          <View style={styles.successHead}>
            <MaterialCommunityIcons name="check-circle" size={26} color="#059669" />
            <Text style={styles.successTitle}>Report submitted. Thank you.</Text>
          </View>
          <Text style={styles.successRef}>Reference {reportId.slice(0, 8)}</Text>
          <Text style={[styles.successNote, { color: c.textMuted }]}>
            You helped protect others. Track it under Reports.
          </Text>
        </View>
      )}

      <Text style={[styles.footer, { color: c.textMuted }]}>
        Unofficial demo. Not affiliated with the official ScamShield.
      </Text>
    </Screen>
  );
}

function SegmentButton({
  testID,
  icon,
  label,
  active,
  onPress,
}: {
  testID: string;
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.segmentBtn, active && { backgroundColor: brand.primary }]}
    >
      <MaterialCommunityIcons name={icon as never} size={16} color={active ? "#fff" : "#64748B"} />
      <Text style={[styles.segmentText, { color: active ? "#fff" : "#64748B" }]}>{label}</Text>
    </Pressable>
  );
}

function CheckButton({
  testID,
  label,
  disabled,
  busy,
  onPress,
}: {
  testID: string;
  label: string;
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
          colors={disabled ? ["#CBD5E1", "#94A3B8"] : [brand.accent, brand.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cta}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="shield-search" size={20} color="#fff" />
              <Text style={styles.ctaText}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const STEPS = [
  {
    icon: "clipboard-text-outline",
    title: "Check a message, number, or email",
    body: "An SMS, link, phone number, or email you are not sure about.",
  },
  {
    icon: "shield-search",
    title: "Get an instant verdict",
    body: "We score it as scam, suspicious, or clean.",
  },
  {
    icon: "account-group-outline",
    title: "Report to protect others",
    body: "Flagged scams help warn the community.",
  },
];

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
  segment: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentText: { fontSize: 14, fontWeight: "700" },

  cardHint: { fontSize: 14, lineHeight: 20 },
  inputWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    minHeight: 110,
  },
  numberWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 54,
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

  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  reportBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  successCard: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 6, backgroundColor: "#ECFDF5" },
  successHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  successTitle: { fontSize: 16, fontWeight: "700", color: "#065F46" },
  successRef: { fontSize: 13, fontWeight: "600", color: "#047857", fontFamily: "monospace" },
  successNote: { fontSize: 13 },

  steps: { gap: 18, paddingHorizontal: 4, paddingTop: 2 },
  step: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: { fontSize: 15, fontWeight: "700" },
  stepBody: { fontSize: 13, lineHeight: 18, marginTop: 1 },

  footer: { textAlign: "center", fontSize: 12, marginTop: 8 },
});
