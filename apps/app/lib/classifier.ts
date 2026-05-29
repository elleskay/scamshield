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
