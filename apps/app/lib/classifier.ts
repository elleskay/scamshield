export type Verdict = "scam" | "suspicious" | "clean";

export interface CheckResult {
  verdict: Verdict;
  score: number;
  reason: string;
}

/**
 * Pure offline heuristic, shared by the Check screen for an instant local
 * verdict before (or without) a round trip to the API. Deterministic and
 * dependency-free. The authoritative classifier (LLM-backed) lives server-side.
 */
export function localHeuristic(text: string): CheckResult {
  const t = text.toLowerCase();
  const hasLink = /https?:\/\/|\bwww\./.test(t);
  const lure = /(verify|urgent|prize|gift|otp|password|bank|click|claim|won)/.test(t);
  if (hasLink && lure) {
    return { verdict: "scam", score: 0.9, reason: "Contains a link and urgency/lure language." };
  }
  if (hasLink || lure) {
    return { verdict: "suspicious", score: 0.5, reason: "Contains a link or pressure language." };
  }
  return { verdict: "clean", score: 0.1, reason: "No common scam markers found." };
}

export interface NumberCheckResult {
  verdict: Verdict;
  score: number;
  reason: string;
  isVerifiedCaller: boolean;
  label?: string;
}

// Mirrors services/api/src/numbers/numbers.service.ts seed + logic so the
// device's offline fallback agrees with the server. Numbers are fake placeholders.
const VERIFIED_NUMBERS: Record<string, string> = {
  "18000001111": "CPF Board",
  "18000002222": "Ministry of Manpower",
  "18000003333": "HealthHub",
};
const SCAM_NUMBERS = new Set(["6580001234", "18005550199", "6590009999"]);

/** Offline fallback for "Check Call". Same shape and seed as the server. */
export function localNumberHeuristic(raw: string): NumberCheckResult {
  const digits = raw.replace(/\D/g, "");
  const label = VERIFIED_NUMBERS[digits];
  if (label) {
    return { verdict: "clean", score: 0.02, reason: `This number belongs to ${label}.`, isVerifiedCaller: true, label };
  }
  if (SCAM_NUMBERS.has(digits)) {
    return {
      verdict: "scam",
      score: 0.97,
      reason: "This number has been reported as a scam.",
      isVerifiedCaller: false,
    };
  }
  if (digits.length > 0 && digits.length < 7) {
    return {
      verdict: "suspicious",
      score: 0.5,
      reason: "Unusually short number, sometimes used to mask the caller.",
      isVerifiedCaller: false,
    };
  }
  return {
    verdict: "clean",
    score: 0.15,
    reason: "Not a known scam number. Stay alert if it is unexpected.",
    isVerifiedCaller: false,
  };
}
