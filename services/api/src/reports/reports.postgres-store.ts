import { Logger } from "@nestjs/common";
import type { Pool } from "pg";
import {
  type AdminReport,
  type NewReport,
  type ReportSummary,
  type ReportsStore,
  type Stats,
  type StoredReport,
  type Verdict,
} from "./reports.store";

const COLS =
  "report_id, device_token, channel, snippet, suggested_verdict, status, cluster_key, created_at, reviewed_at";

interface Row {
  report_id: string;
  device_token: string | null;
  channel: string | null;
  snippet: string;
  suggested_verdict: Verdict | null;
  status: StoredReport["status"];
  cluster_key: string | null;
  created_at: string;
  reviewed_at: string | null;
}

function toStored(r: Row): StoredReport {
  return {
    reportId: r.report_id,
    deviceToken: r.device_token ?? undefined,
    channel: r.channel ?? undefined,
    snippet: r.snippet,
    suggestedVerdict: r.suggested_verdict ?? null,
    status: r.status,
    clusterKey: r.cluster_key ?? null,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at ?? undefined,
  };
}

function toSummaryRow(r: Row): ReportSummary {
  return {
    reportId: r.report_id,
    status: r.status,
    suggestedVerdict: r.suggested_verdict ?? null,
    channel: r.channel ?? undefined,
    snippet: r.snippet,
    createdAt: r.created_at,
  };
}

/**
 * Durable, multi-instance store backed by Postgres (Neon's pooled endpoint in
 * production; any Postgres locally/CI). Uses node-postgres so the same code runs
 * against Neon's pooler and a plain Postgres service container.
 */
export class PostgresStore implements ReportsStore {
  private readonly logger = new Logger(PostgresStore.name);
  private pool!: Pool;

  // Keep this app's tables in their own schema so a shared Postgres/Neon database
  // (which may already host an unrelated `public.reports` etc.) is never clobbered.
  // A bare identifier is enforced so it is safe to interpolate into DDL.
  private readonly schema = (process.env.DATABASE_SCHEMA ?? "scamshield").replace(/[^a-z0-9_]/gi, "");
  private get reports(): string {
    return `${this.schema}.reports`;
  }
  private get processed(): string {
    return `${this.schema}.processed_reports`;
  }
  private get counters(): string {
    return `${this.schema}.counters`;
  }

  constructor(private readonly connectionString: string) {}

  async init(): Promise<void> {
    const { Pool } = await import("pg");
    const needsSsl = /sslmode=require|neon\.tech/.test(this.connectionString);
    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
      max: 2,
    });
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS ${this.reports} (
      report_id TEXT PRIMARY KEY,
      device_token TEXT,
      channel TEXT,
      snippet TEXT NOT NULL,
      suggested_verdict TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      cluster_key TEXT,
      created_at TEXT NOT NULL,
      reviewed_at TEXT
    )`);
    await this.pool.query(`CREATE TABLE IF NOT EXISTS ${this.processed} (report_id TEXT PRIMARY KEY)`);
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS ${this.counters} (name TEXT PRIMARY KEY, value BIGINT NOT NULL DEFAULT 0)`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_reports_device ON ${this.reports}(device_token)`,
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_reports_cluster ON ${this.reports}(cluster_key)`,
    );
    this.logger.log(`Postgres store ready (schema ${this.schema})`);
  }

  async recordCheck(): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${this.counters}(name, value) VALUES ('checks', 1)
       ON CONFLICT (name) DO UPDATE SET value = ${this.counters}.value + 1`,
    );
  }

  async addReport(r: NewReport): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${this.reports} (report_id, device_token, channel, snippet, created_at, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') ON CONFLICT (report_id) DO NOTHING`,
      [r.reportId, r.deviceToken ?? null, r.channel ?? null, r.snippet, r.createdAt],
    );
  }

  async markProcessedIfNew(reportId: string): Promise<boolean> {
    const res = await this.pool.query(
      `INSERT INTO ${this.processed}(report_id) VALUES ($1)
       ON CONFLICT (report_id) DO NOTHING RETURNING report_id`,
      [reportId],
    );
    return (res.rowCount ?? 0) > 0;
  }

  async setSuggestion(reportId: string, verdict: Verdict, key: string): Promise<void> {
    await this.pool.query(
      `UPDATE ${this.reports} SET suggested_verdict = $2, cluster_key = $3 WHERE report_id = $1`,
      [reportId, verdict, key],
    );
  }

  async clusterCount(key: string): Promise<number> {
    const res = await this.pool.query<{ n: string }>(
      `SELECT count(*) AS n FROM ${this.reports} WHERE cluster_key = $1`,
      [key],
    );
    return Number(res.rows[0]?.n ?? 0);
  }

  async verify(reportId: string, verdict: Verdict): Promise<StoredReport | null> {
    const res = await this.pool.query<Row>(
      `UPDATE ${this.reports} SET status = $2, reviewed_at = $3 WHERE report_id = $1 RETURNING ${COLS}`,
      [reportId, verdict, new Date().toISOString()],
    );
    return res.rows[0] ? toStored(res.rows[0]) : null;
  }

  async listByDevice(deviceToken: string): Promise<ReportSummary[]> {
    const res = await this.pool.query<Row>(
      `SELECT ${COLS} FROM ${this.reports} WHERE device_token = $1 ORDER BY created_at DESC`,
      [deviceToken],
    );
    return res.rows.map(toSummaryRow);
  }

  async listAll(): Promise<AdminReport[]> {
    const res = await this.pool.query<Row>(
      `SELECT ${COLS} FROM ${this.reports} ORDER BY created_at DESC`,
    );
    return res.rows.map(toSummaryRow);
  }

  async stats(): Promise<Stats> {
    const res = await this.pool.query<{ checks: string; reports: string; confirmed: string }>(
      `SELECT
         (SELECT coalesce(value, 0) FROM ${this.counters} WHERE name = 'checks') AS checks,
         (SELECT count(*) FROM ${this.reports}) AS reports,
         (SELECT count(*) FROM ${this.reports} WHERE status = 'scam') AS confirmed`,
    );
    const row = res.rows[0];
    return {
      checks: Number(row?.checks ?? 0),
      reports: Number(row?.reports ?? 0),
      confirmedScams: Number(row?.confirmed ?? 0),
    };
  }
}
