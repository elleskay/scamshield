import { Injectable, Logger } from "@nestjs/common";
import { NumbersService } from "../numbers/numbers.service";

export interface Classification {
  verdict: "scam" | "suspicious" | "clean" | "spam";
  score: number;
  reason: string;
  source: "llm" | "heuristic";
  /** A known scam phone number found inside the message body, if any. */
  flaggedNumber?: string;
  /** The label of a trusted registered sender, when the message is from one. */
  trustedSender?: string;
}

export interface ClassifyOptions {
  /** The message's Sender ID, when known (enables the trusted-sender check). */
  sender?: string;
}

// Trusted registered Sender IDs (channel-verified). Mirrors the app's set so the
// device's offline fallback agrees. Matched on the alphanumeric, upper-cased form.
const TRUSTED_SENDERS: Record<string, string> = {
  CPF: "CPF Board",
  IRAS: "IRAS",
  MOM: "Ministry of Manpower",
  MOH: "Ministry of Health",
  MAS: "MAS",
  HPB: "Health Promotion Board",
  SINGPASS: "Singpass",
  HEALTHHUB: "HealthHub",
};

/**
 * Scam / phishing classifier. Calls the configured LLM endpoint when available,
 * otherwise falls back to a deterministic heuristic so the API is functional and
 * testable without a model. Mirrors the app's offline heuristic so verdicts are
 * consistent between device and server. Two authoritative overrides wrap the
 * base verdict: a trusted Sender ID is cleared, and a known scam number embedded
 * in the body is flagged as a scam.
 */
@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);
  private readonly apiUrl = process.env.CLASSIFIER_API_URL;
  private readonly apiKey = process.env.CLASSIFIER_API_KEY;

  constructor(private readonly numbers: NumbersService) {}

  async classify(text: string, opts?: ClassifyOptions): Promise<Classification> {
    // A message from a registered, channel-verified sender is trusted.
    const trustedSender = this.trustedSenderLabel(opts?.sender);
    if (trustedSender) {
      return {
        verdict: "clean",
        score: 0.05,
        reason: `Registered sender (${trustedSender}). Still treat unexpected requests with caution.`,
        source: "heuristic",
        trustedSender,
      };
    }
    const base = await this.classifyBase(text);
    // A known scam number in the body is authoritative: escalate to scam.
    const flaggedNumber = this.numbers.findScamNumber(text);
    if (flaggedNumber) {
      return {
        verdict: "scam",
        score: Math.max(base.score, 0.95),
        reason: "Contains a phone number reported as a scam.",
        source: base.source,
        flaggedNumber,
      };
    }
    return base;
  }

  private trustedSenderLabel(sender?: string): string | undefined {
    if (!sender) return undefined;
    return TRUSTED_SENDERS[sender.toUpperCase().replace(/[^A-Z0-9]/g, "")];
  }

  private async classifyBase(text: string): Promise<Classification> {
    if (this.apiUrl && this.apiKey) {
      try {
        return await this.classifyWithLlm(text);
      } catch (err) {
        this.logger.warn(
          `LLM classify failed, falling back to heuristic: ${(err as Error).message}`,
        );
      }
    }
    return this.heuristic(text);
  }

  private async classifyWithLlm(text: string): Promise<Classification> {
    const res = await fetch(`${this.apiUrl}/classify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`classifier ${res.status}`);
    const data = (await res.json()) as Partial<Classification>;
    // Validate the model's response; a malformed reply falls back to the heuristic.
    if (data.verdict !== "scam" && data.verdict !== "suspicious" && data.verdict !== "clean") {
      throw new Error("classifier returned an invalid verdict");
    }
    const score = Number(data.score);
    return {
      verdict: data.verdict,
      score: Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0.5,
      reason: typeof data.reason === "string" ? data.reason : "Classified by model.",
      source: "llm",
    };
  }

  heuristic(text: string): Classification {
    const t = text.toLowerCase();
    const hasLink = /https?:\/\/|\bwww\./.test(t);
    const lure = /(verify|urgent|prize|gift|otp|password|bank|click)/.test(t);
    const promo =
      /(unsubscribe|\bsale\b|discount|%\s?off|\bpromo|coupon|newsletter|limited time|offer ends|deal of)/.test(
        t,
      );
    if (hasLink && lure)
      return { verdict: "scam", score: 0.9, reason: "Link plus urgency lure.", source: "heuristic" };
    if (promo)
      return {
        verdict: "spam",
        score: 0.4,
        reason: "Unsolicited promotional content, not a scam.",
        source: "heuristic",
      };
    if (hasLink || lure)
      return {
        verdict: "suspicious",
        score: 0.5,
        reason: "Contains a link or pressure language.",
        source: "heuristic",
      };
    return { verdict: "clean", score: 0.1, reason: "No common scam markers.", source: "heuristic" };
  }
}
