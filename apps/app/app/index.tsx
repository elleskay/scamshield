import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { checkMessage, submitReport, type CheckResult } from "@/lib/api";

export default function CheckScreen() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Check a message</Text>
      <TextInput
        testID="message-input"
        style={styles.input}
        placeholder="Paste a suspicious SMS or message"
        value={text}
        onChangeText={setText}
        multiline
      />
      <Pressable
        testID="check-button"
        accessibilityRole="button"
        style={[styles.button, (busy || !text) && styles.buttonDisabled]}
        disabled={busy || !text}
        onPress={() => void onCheck()}
      >
        <Text style={styles.buttonText}>{busy ? "Working..." : "Check"}</Text>
      </Pressable>

      {result && (
        <View testID="verdict" style={styles.result}>
          <Text style={styles.verdict}>{result.verdict.toUpperCase()}</Text>
          <Text style={styles.reason}>{result.reason}</Text>
        </View>
      )}

      {flagged && !reportId && (
        <Pressable
          testID="report-button"
          accessibilityRole="button"
          style={[styles.button, styles.reportButton, busy && styles.buttonDisabled]}
          disabled={busy}
          onPress={() => void onReport()}
        >
          <Text style={styles.buttonText}>Report this scam</Text>
        </Pressable>
      )}

      {reportId && (
        <View testID="report-confirmation" style={styles.confirmation}>
          <Text style={styles.confirmText}>Report submitted. Thank you.</Text>
          <Text style={styles.reason}>Reference: {reportId}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  heading: { fontSize: 22, fontWeight: "600" },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#0b6e4f",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  reportButton: { backgroundColor: "#a3341f" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
  result: { gap: 4, padding: 12, borderRadius: 8, backgroundColor: "#f1f5f4" },
  verdict: { fontSize: 18, fontWeight: "700" },
  reason: { color: "#444" },
  confirmation: { gap: 4, padding: 12, borderRadius: 8, backgroundColor: "#eef6f1" },
  confirmText: { fontSize: 16, fontWeight: "600", color: "#0b6e4f" },
});
