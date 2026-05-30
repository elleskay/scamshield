import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { REPORTS_STORE, type ReportsStore } from "../reports/reports.store";

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
const SEED_SCAM = ["6580001234", "18005550199", "6590009999"];

/**
 * "Check Call": classify a phone number as a known scam, a verified government
 * caller, or unknown. The scam set is the built-in seed plus any numbers an admin
 * has uploaded to the blocklist (loaded durably from the store at startup). The
 * native call-screening layer consumes `blocklist()`.
 */
@Injectable()
export class NumbersService implements OnModuleInit {
  // Built-in seed + admin-uploaded numbers (loaded from the store on init).
  private readonly scam = new Set<string>(SEED_SCAM);

  constructor(@Inject(REPORTS_STORE) private readonly store: ReportsStore) {}

  async onModuleInit(): Promise<void> {
    await this.store.init();
    for (const n of await this.store.blockedNumbers()) this.scam.add(n);
  }

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
    if (this.scam.has(digits)) {
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
    return Array.from(this.scam)
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
      if (this.scam.has(digits)) return digits;
    }
    return null;
  }

  /**
   * Add admin-uploaded numbers to the scam blocklist (persisted durably and merged
   * into this instance). Returns how many were newly added and the new total.
   */
  async addToBlocklist(raw: string[]): Promise<{ added: number; total: number }> {
    const digits = raw.map((n) => n.replace(/\D/g, "")).filter((n) => n.length >= 7);
    const added = await this.store.blockNumbers(digits);
    for (const n of digits) this.scam.add(n);
    return { added, total: this.scam.size };
  }
}
