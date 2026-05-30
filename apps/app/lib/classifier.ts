export type Verdict = "scam" | "suspicious" | "clean" | "spam";

export interface CheckResult {
  verdict: Verdict;
  score: number;
  reason: string;
  /** How many similar reports the server has seen (set by the API, not offline). */
  reportedCount?: number;
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
  // Spam = unsolicited promotional content (not necessarily a scam).
  const promo = /(unsubscribe|\bsale\b|discount|%\s?off|\bpromo|coupon|newsletter|limited time|offer ends|deal of)/.test(t);
  if (hasLink && lure) {
    return { verdict: "scam", score: 0.9, reason: "Contains a link and urgency/lure language." };
  }
  if (promo) {
    return {
      verdict: "spam",
      score: 0.4,
      reason: "Looks like unsolicited promotional content, not a scam.",
    };
  }
  if (hasLink || lure) {
    return { verdict: "suspicious", score: 0.5, reason: "Contains a link or pressure language." };
  }
  return { verdict: "clean", score: 0.1, reason: "No common scam markers found." };
}

/**
 * Email-specific heuristic: the message heuristic plus a spoofed-sender signal
 * (lookalike brand domains, or a brand name on a throwaway TLD). Phishing emails
 * commonly impersonate a trusted sender, so this catches cases the link/lure pass
 * alone would only mark suspicious.
 */
export function localEmailHeuristic(text: string): CheckResult {
  const t = text.toLowerCase();
  const lookalike =
    /\b(paypa1|g00gle|micros0ft|amaz0n|app1e|netfl1x|faceb00k)\b/.test(t) ||
    /(from|sender)\s*:?[^\n]*@[\w.-]*\.(xyz|top|click|live|info|zip|mov)\b/.test(t);
  if (lookalike) {
    return {
      verdict: "scam",
      score: 0.95,
      reason: "Sender address looks spoofed (lookalike domain).",
    };
  }
  return localHeuristic(text);
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
