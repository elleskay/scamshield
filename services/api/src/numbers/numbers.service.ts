import { Injectable } from "@nestjs/common";

export interface NumberClassification {
  number: string;
  verdict: "scam" | "suspicious" | "clean";
  score: number;
  reason: string;
  source: "list" | "heuristic";
  isVerifiedCaller: boolean;
  label?: string;
}

// Demo seed data. In production the scam set comes from the reported-number
// datastore and the verified map from a government-agency registry. These mirror
// apps/app/lib/classifier.ts so the device's offline fallback agrees with the
// server. Numbers here are deliberately fake placeholders.
const VERIFIED: Record<string, string> = {
  "18000001111": "CPF Board",
  "18000002222": "Ministry of Manpower",
  "18000003333": "HealthHub",
};
const SCAM = new Set(["6580001234", "18005550199", "6590009999"]);

/**
 * "Check Call": classify a phone number as a known scam, a verified government
 * caller, or unknown. Deterministic and dependency-free, like the message
 * heuristic. The native call-screening layer consumes `blocklist()`.
 */
@Injectable()
export class NumbersService {
  classify(raw: string): NumberClassification {
    const digits = raw.replace(/\D/g, "");
    const label = VERIFIED[digits];
    if (label) {
      return {
        number: digits,
        verdict: "clean",
        score: 0.02,
        reason: `This number belongs to ${label}.`,
        source: "list",
        isVerifiedCaller: true,
        label,
      };
    }
    if (SCAM.has(digits)) {
      return {
        number: digits,
        verdict: "scam",
        score: 0.97,
        reason: "This number has been reported as a scam.",
        source: "list",
        isVerifiedCaller: false,
      };
    }
    if (digits.length > 0 && digits.length < 7) {
      return {
        number: digits,
        verdict: "suspicious",
        score: 0.5,
        reason: "Unusually short number, sometimes used to mask the caller.",
        source: "heuristic",
        isVerifiedCaller: false,
      };
    }
    return {
      number: digits,
      verdict: "clean",
      score: 0.15,
      reason: "Not a known scam number. Stay alert if it is unexpected.",
      source: "heuristic",
      isVerifiedCaller: false,
    };
  }

  /** Known-scam numbers as ascending int64s, for the device's native blocklist. */
  blocklist(): number[] {
    return Array.from(SCAM)
      .map(Number)
      .sort((a, b) => a - b);
  }

  /**
   * The first known scam phone number embedded in a block of text, or null. Used
   * to flag a message that tells the reader to call a reported scam number.
   */
  findScamNumber(text: string): string | null {
    const candidates = text.match(/\+?\d[\d\s().-]{5,}\d/g) ?? [];
    for (const candidate of candidates) {
      const digits = candidate.replace(/\D/g, "");
      if (SCAM.has(digits)) return digits;
    }
    return null;
  }
}
