import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ClassifierService, type Classification } from "../classifier/classifier.service";
import { OpenSearchService } from "../search/opensearch.service";
import { PushService } from "../push/push.service";
import type { CreateReportDto } from "./dto/create-report.dto";

export interface ReportReceipt {
  reportId: string;
  status: "queued";
}

export interface ReportMessage {
  reportId: string;
  text: string;
  channel?: string;
  deviceToken?: string;
}

export type Verdict = "scam" | "suspicious" | "clean" | "spam";
// "pending" = awaiting human (admin) review; the others are the reviewed verdict.
export type ReportStatus = "pending" | Verdict;

interface StoredReport {
  reportId: string;
  deviceToken?: string;
  channel?: string;
  snippet: string;
  // The machine suggestion from the classifier (set by the consumer).
  suggestedVerdict: Verdict | null;
  // The authoritative status: "pending" until an admin reviews it.
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string;
}

/** Public view of a report, returned to the owning device. No full content. */
export interface ReportSummary {
  reportId: string;
  status: ReportStatus;
  suggestedVerdict: Verdict | null;
  channel?: string;
  snippet: string;
  createdAt: string;
}

/** Admin view of a report (same shape today; kept distinct for future fields). */
export type AdminReport = ReportSummary;

/** Check response: the classification plus how many similar reports we have seen. */
export interface CheckResponse extends Classification {
  reportedCount: number;
}

export interface Stats {
  checks: number;
  reports: number;
  confirmedScams: number;
}

/**
 * Check-and-report domain. `check` classifies a message synchronously for the
 * app. `submit` enqueues a report onto SQS for async processing. The heavy work
 * (classify, index, notify) happens in the SQS consumer, not on the request path.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly queueUrl = process.env.REPORTS_QUEUE_URL;
  // Idempotency guard. SQS is at-least-once, so dedupe on reportId. In-memory
  // for the MVP; back this with a Postgres unique key (or a dedupe table) for
  // multi-instance correctness.
  private readonly processed = new Set<string>();
  // Report store, so a device can see its own reports and their verification
  // status. In-memory for the MVP; back this with Postgres (the real app uses an
  // RDBMS) keyed on reportId, indexed by deviceToken, for durability and scale.
  private readonly byId = new Map<string, StoredReport>();
  // Usage counters and a similar-report cluster index (in-memory; OpenSearch does
  // this at scale, see OpenSearchService). Clustering groups reports by scam-link
  // domain (else a normalized text key) so the app can say "reported N times".
  private checksCount = 0;
  private reportsCount = 0;
  private confirmedScamsCount = 0;
  private readonly clusters = new Map<string, number>();

  constructor(
    private readonly classifier: ClassifierService,
    private readonly search: OpenSearchService,
    private readonly push: PushService,
  ) {}

  async check(text: string): Promise<CheckResponse> {
    this.checksCount += 1;
    const classification = await this.classifier.classify(text);
    return { ...classification, reportedCount: this.clusters.get(clusterKey(text)) ?? 0 };
  }

  /** Aggregate counters surfaced to users (the awareness/stats strip). */
  stats(): Stats {
    return {
      checks: this.checksCount,
      reports: this.reportsCount,
      confirmedScams: this.confirmedScamsCount,
    };
  }

  async submit(dto: CreateReportDto): Promise<ReportReceipt> {
    this.reportsCount += 1;
    const reportId = randomUUID();
    this.byId.set(reportId, {
      reportId,
      deviceToken: dto.deviceToken,
      channel: dto.channel,
      snippet: snippetOf(dto.text),
      suggestedVerdict: null,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    await this.enqueue({ reportId, ...dto });
    return { reportId, status: "queued" };
  }

  /** A device's own reports, newest first. Empty without a device token. */
  list(deviceToken?: string): ReportSummary[] {
    if (!deviceToken) return [];
    return Array.from(this.byId.values())
      .filter((r) => r.deviceToken === deviceToken)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSummary);
  }

  /** All reports, newest first. For the admin verification dashboard. */
  listAll(): AdminReport[] {
    return Array.from(this.byId.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSummary);
  }

  /**
   * Admin verification: set the authoritative status. Marking a report a scam
   * notifies the reporter (the "push when authorities confirm it" loop). Returns
   * the updated report, or null if the id is unknown.
   */
  async verify(reportId: string, verdict: Verdict): Promise<AdminReport | null> {
    const stored = this.byId.get(reportId);
    if (!stored) return null;
    stored.status = verdict;
    stored.reviewedAt = new Date().toISOString();
    if (verdict === "scam") {
      this.confirmedScamsCount += 1;
      if (stored.deviceToken) await this.push.notifyScam(stored.deviceToken, reportId);
    }
    this.logger.log(`report ${reportId} reviewed: ${verdict}`);
    return toSummary(stored);
  }

  /**
   * Processes one report from the queue. Idempotent: a duplicate delivery of the
   * same reportId is a no-op (CLAUDE.md gotcha #7).
   */
  async process(message: ReportMessage): Promise<void> {
    if (this.processed.has(message.reportId)) {
      this.logger.debug(`duplicate delivery of ${message.reportId}; skipping`);
      return;
    }
    this.processed.add(message.reportId);

    const classification = await this.classifier.classify(message.text);

    // Record the machine suggestion. The report stays "pending" until a human
    // (admin) reviews it; the push to the reporter happens on that review, not
    // here. This mirrors the real flow: police verify, then the reporter is told.
    const stored = this.byId.get(message.reportId);
    if (stored) stored.suggestedVerdict = classification.verdict;

    // Cluster similar reports so the app can say "reported N times".
    const key = clusterKey(message.text);
    this.clusters.set(key, (this.clusters.get(key) ?? 0) + 1);

    await this.search.index({
      id: message.reportId,
      text: message.text,
      verdict: classification.verdict,
      createdAt: new Date().toISOString(),
    });

    this.logger.log(
      `processed report ${message.reportId}: suggested ${classification.verdict} (${classification.source})`,
    );
  }

  private async enqueue(payload: ReportMessage): Promise<void> {
    if (!this.queueUrl) {
      // Local / CI: no queue. Process inline so the flow still works end to end.
      this.logger.debug("REPORTS_QUEUE_URL unset; processing inline.");
      await this.process(payload);
      return;
    }
    const { SQSClient, SendMessageCommand } = await import("@aws-sdk/client-sqs");
    const client = new SQSClient({});
    await client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(payload),
      }),
    );
  }
}

/** A short, single-line preview of the reported content. */
function snippetOf(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine;
}

/** Groups similar reports: by scam-link domain, else a normalized text key. */
function clusterKey(text: string): string {
  const domain = /https?:\/\/([\w.-]+)/i.exec(text)?.[1]?.toLowerCase();
  if (domain) return `domain:${domain}`;
  const norm = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `text:${norm.slice(0, 60)}`;
}

function toSummary(r: StoredReport): ReportSummary {
  return {
    reportId: r.reportId,
    status: r.status,
    suggestedVerdict: r.suggestedVerdict,
    channel: r.channel,
    snippet: r.snippet,
    createdAt: r.createdAt,
  };
}
