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

export type ReportStatus = "queued" | "scam" | "suspicious" | "clean";

interface StoredReport {
  reportId: string;
  deviceToken?: string;
  channel?: string;
  snippet: string;
  status: ReportStatus;
  createdAt: string;
}

/** Public view of a report, returned to the owning device. No full content. */
export interface ReportSummary {
  reportId: string;
  status: ReportStatus;
  channel?: string;
  snippet: string;
  createdAt: string;
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

  constructor(
    private readonly classifier: ClassifierService,
    private readonly search: OpenSearchService,
    private readonly push: PushService,
  ) {}

  async check(text: string): Promise<Classification> {
    return this.classifier.classify(text);
  }

  async submit(dto: CreateReportDto): Promise<ReportReceipt> {
    const reportId = randomUUID();
    this.byId.set(reportId, {
      reportId,
      deviceToken: dto.deviceToken,
      channel: dto.channel,
      snippet: snippetOf(dto.text),
      status: "queued",
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
      .map(({ reportId, status, channel, snippet, createdAt }) => ({
        reportId,
        status,
        channel,
        snippet,
        createdAt,
      }));
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

    // Record the verification outcome so the reporter can see it under Reports.
    const stored = this.byId.get(message.reportId);
    if (stored) stored.status = classification.verdict;

    await this.search.index({
      id: message.reportId,
      text: message.text,
      verdict: classification.verdict,
      createdAt: new Date().toISOString(),
    });

    // Notify the reporter when their report is confirmed a scam.
    if (classification.verdict === "scam" && message.deviceToken) {
      await this.push.notifyScam(message.deviceToken, message.reportId);
    }

    this.logger.log(
      `processed report ${message.reportId}: ${classification.verdict} (${classification.source})`,
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
