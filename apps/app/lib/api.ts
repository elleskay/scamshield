import Constants from "expo-constants";
import {
  localHeuristic,
  localNumberHeuristic,
  type CheckResult,
  type NumberCheckResult,
} from "./classifier";

// EXPO_PUBLIC_* is inlined into the bundle and is public. The API base URL is
// fine here; never put API keys in the bundle. See CLAUDE.md gotcha #4.
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:3000";

export type { CheckResult, NumberCheckResult };

export interface ReportReceipt {
  reportId: string;
  status: string;
}

/** Classify a message. Falls back to the offline heuristic if the API is unreachable. */
export async function checkMessage(text: string): Promise<CheckResult> {
  try {
    const res = await fetch(`${API_URL}/reports/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return (await res.json()) as CheckResult;
  } catch {
    return localHeuristic(text);
  }
}

/** Check a phone number ("Check Call"). Falls back to the offline heuristic. */
export async function checkNumber(number: string): Promise<NumberCheckResult> {
  try {
    const res = await fetch(`${API_URL}/numbers/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ number }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const body = (await res.json()) as NumberCheckResult;
    return {
      verdict: body.verdict,
      score: body.score,
      reason: body.reason,
      isVerifiedCaller: !!body.isVerifiedCaller,
      label: body.label,
    };
  } catch {
    return localNumberHeuristic(number);
  }
}

/** Submit a flagged message as a report. Returns the report id from the API. */
export async function submitReport(text: string, deviceToken?: string): Promise<ReportReceipt> {
  const res = await fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, channel: "message", deviceToken }),
  });
  if (!res.ok) throw new Error(`report failed: ${res.status}`);
  return (await res.json()) as ReportReceipt;
}
