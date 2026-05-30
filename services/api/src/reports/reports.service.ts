import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ClassifierService, type Classification } from "../classifier/classifier.service";
import { OpenSearchService } from "../search/opensearch.service";
import { PushService } from "../push/push.service";
import type { CreateReportDto } from "./dto/create-report.dto";
import {
  REPORTS_STORE,
  clusterKey,
  snippetOf,
  toSummary,
  type AdminReport,
  type ReportFilter,
  type ReportSummary,
  type ReportsStore,
  type Stats,
  type Verdict,
} from "./reports.store";

/** Escape a value for a CSV cell (RFC 4180): quote if it contains , " or newline. */
function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Re-export the domain types so existing importers (controllers, consumer) are
// unaffected by the move to reports.store.ts.
export type { Verdict, ReportStatus, ReportSummary, AdminReport, Stats } from "./reports.store";

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

/** Check response: the classification plus how many similar reports we have seen. */
export interface CheckResponse extends Classification {
  reportedCount: number;
}

/**
 * Check-and-report domain. `check` classifies synchronously for the app; `submit`
 * enqueues a report onto SQS for async processing (classify, index) in the
 * consumer. All state lives behind a ReportsStore (in-memory or Postgres).
 */
@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name);
  private readonly queueUrl = process.env.REPORTS_QUEUE_URL;

  constructor(
    @Inject(REPORTS_STORE) private readonly store: ReportsStore,
    private readonly classifier: ClassifierService,
    private readonly search: OpenSearchService,
    private readonly push: PushService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.store.init();
  }

  async check(text: string, sender?: string): Promise<CheckResponse> {
    await this.store.recordCheck();
    const classification = await this.classifier.classify(text, { sender });
    return { ...classification, reportedCount: await this.store.clusterCount(clusterKey(text)) };
  }

  /** Aggregate counters surfaced to users (the awareness/stats strip). */
  stats(): Promise<Stats> {
    return this.store.stats();
  }

  async submit(dto: CreateReportDto): Promise<ReportReceipt> {
    const reportId = randomUUID();
    await this.store.addReport({
      reportId,
      deviceToken: dto.deviceToken,
      channel: dto.channel,
      snippet: snippetOf(dto.text),
      createdAt: new Date().toISOString(),
    });
    await this.enqueue({ reportId, ...dto });
    return { reportId, status: "queued" };
  }

  /** A device's own reports, newest first. Empty without a device token. */
  list(deviceToken?: string): Promise<ReportSummary[]> {
    return deviceToken ? this.store.listByDevice(deviceToken) : Promise.resolve([]);
  }

  /** All reports, newest first, optionally filtered. For the admin dashboard. */
  listAll(filter?: ReportFilter): Promise<AdminReport[]> {
    return this.store.listAll(filter);
  }

  /** The filtered reports rendered as a CSV document (header row + one row each). */
  async exportCsv(filter?: ReportFilter): Promise<string> {
    const rows = await this.store.listAll(filter);
    const header = ["reportId", "createdAt", "channel", "status", "suggestedVerdict", "snippet"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [r.reportId, r.createdAt, r.channel ?? "", r.status, r.suggestedVerdict ?? "", r.snippet]
          .map(csvCell)
          .join(","),
      );
    }
    return `${lines.join("\n")}\n`;
  }

  /**
   * Admin verification: set the authoritative status. Marking a report a scam
   * notifies the reporter. Returns the updated report, or null if id is unknown.
   */
  async verify(reportId: string, verdict: Verdict): Promise<AdminReport | null> {
    const updated = await this.store.verify(reportId, verdict);
    if (!updated) return null;
    if (verdict === "scam" && updated.deviceToken) {
      await this.push.notifyScam(updated.deviceToken, reportId);
    }
    this.logger.log(`report ${reportId} reviewed: ${verdict}`);
    return toSummary(updated);
  }

  /**
   * Processes one report from the queue. Idempotent: a duplicate delivery of the
   * same reportId is a no-op (CLAUDE.md gotcha #7). Records the machine suggestion;
   * the report stays pending until an admin reviews it.
   */
  async process(message: ReportMessage): Promise<void> {
    if (!(await this.store.markProcessedIfNew(message.reportId))) {
      this.logger.debug(`duplicate delivery of ${message.reportId}; skipping`);
      return;
    }
    const classification = await this.classifier.classify(message.text);
    await this.store.setSuggestion(
      message.reportId,
      classification.verdict,
      clusterKey(message.text),
    );
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
