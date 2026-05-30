/* eslint-disable @typescript-eslint/require-await --
   InMemoryStore implements the async ReportsStore interface with synchronous
   bodies; the async signatures are required by the interface (PostgresStore awaits). */
// Persistence boundary for the check-and-report domain. Two implementations:
// InMemoryStore (default; CI, local, offline) and PostgresStore (durable,
// multi-instance correct; used when DATABASE_URL is set). Postgres is what makes
// the live stats/clustering/status correct across the split Lambda + SQS
// topology, where in-memory state is per-instance and ephemeral.

export type Verdict = "scam" | "suspicious" | "clean" | "spam";
export type ReportStatus = "pending" | Verdict;

export interface StoredReport {
  reportId: string;
  deviceToken?: string;
  channel?: string;
  snippet: string;
  suggestedVerdict: Verdict | null;
  status: ReportStatus;
  clusterKey: string | null;
  createdAt: string;
  reviewedAt?: string;
}

export interface ReportSummary {
  reportId: string;
  status: ReportStatus;
  suggestedVerdict: Verdict | null;
  channel?: string;
  snippet: string;
  createdAt: string;
}

export type AdminReport = ReportSummary;

export interface Stats {
  checks: number;
  reports: number;
  confirmedScams: number;
}

export interface NewReport {
  reportId: string;
  deviceToken?: string;
  channel?: string;
  snippet: string;
  createdAt: string;
}

export const REPORTS_STORE = "REPORTS_STORE";

export interface ReportsStore {
  init(): Promise<void>;
  recordCheck(): Promise<void>;
  addReport(report: NewReport): Promise<void>;
  /** Idempotency: true the first time a reportId is processed, false on duplicates. */
  markProcessedIfNew(reportId: string): Promise<boolean>;
  setSuggestion(reportId: string, verdict: Verdict, clusterKey: string): Promise<void>;
  clusterCount(clusterKey: string): Promise<number>;
  /** Sets the authoritative status; returns the updated row (with deviceToken) or null. */
  verify(reportId: string, verdict: Verdict): Promise<StoredReport | null>;
  listByDevice(deviceToken: string): Promise<ReportSummary[]>;
  listAll(): Promise<AdminReport[]>;
  stats(): Promise<Stats>;
}

/** A short, single-line preview of the reported content. */
export function snippetOf(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine;
}

/** Groups similar reports: by scam-link domain, else a normalized text key. */
export function clusterKey(text: string): string {
  const domain = /https?:\/\/([\w.-]+)/i.exec(text)?.[1]?.toLowerCase();
  if (domain) return `domain:${domain}`;
  const norm = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `text:${norm.slice(0, 60)}`;
}

export function toSummary(r: StoredReport): ReportSummary {
  return {
    reportId: r.reportId,
    status: r.status,
    suggestedVerdict: r.suggestedVerdict,
    channel: r.channel,
    snippet: r.snippet,
    createdAt: r.createdAt,
  };
}

/** In-memory store. Per-instance and non-durable; fine for CI/local/offline. */
export class InMemoryStore implements ReportsStore {
  private checks = 0;
  private readonly processed = new Set<string>();
  private readonly byId = new Map<string, StoredReport>();

  async init(): Promise<void> {}

  async recordCheck(): Promise<void> {
    this.checks += 1;
  }

  async addReport(r: NewReport): Promise<void> {
    this.byId.set(r.reportId, {
      ...r,
      suggestedVerdict: null,
      status: "pending",
      clusterKey: null,
    });
  }

  async markProcessedIfNew(reportId: string): Promise<boolean> {
    if (this.processed.has(reportId)) return false;
    this.processed.add(reportId);
    return true;
  }

  async setSuggestion(reportId: string, verdict: Verdict, key: string): Promise<void> {
    const r = this.byId.get(reportId);
    if (r) {
      r.suggestedVerdict = verdict;
      r.clusterKey = key;
    }
  }

  async clusterCount(key: string): Promise<number> {
    let n = 0;
    for (const r of this.byId.values()) if (r.clusterKey === key) n += 1;
    return n;
  }

  async verify(reportId: string, verdict: Verdict): Promise<StoredReport | null> {
    const r = this.byId.get(reportId);
    if (!r) return null;
    r.status = verdict;
    r.reviewedAt = new Date().toISOString();
    return r;
  }

  async listByDevice(deviceToken: string): Promise<ReportSummary[]> {
    return Array.from(this.byId.values())
      .filter((r) => r.deviceToken === deviceToken)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSummary);
  }

  async listAll(): Promise<AdminReport[]> {
    return Array.from(this.byId.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toSummary);
  }

  async stats(): Promise<Stats> {
    let confirmedScams = 0;
    for (const r of this.byId.values()) if (r.status === "scam") confirmedScams += 1;
    return { checks: this.checks, reports: this.byId.size, confirmedScams };
  }
}
