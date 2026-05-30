import { describe } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { randomUUID } from "node:crypto";
import { PostgresStore } from "./reports.postgres-store";

// Runs only when TEST_DATABASE_URL points at a Postgres (the CI job provides a
// Postgres service container). Skipped locally/offline, where the in-memory store
// and its behavioural tests cover the same logic.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("PostgresStore", () => {
  test("[SCAM-DB-001] reports, clustering and stats persist durably in Postgres", async () => {
    const store = new PostgresStore(url as string);
    await store.init();

    const device = `dev-${randomUUID()}`;
    const reportId = randomUUID();

    await store.recordCheck();
    await store.addReport({
      reportId,
      deviceToken: device,
      channel: "message",
      snippet: "win a prize http://db-test.example",
      createdAt: new Date().toISOString(),
    });

    // Idempotent processing.
    expect(await store.markProcessedIfNew(reportId)).toBe(true);
    expect(await store.markProcessedIfNew(reportId)).toBe(false);

    await store.setSuggestion(reportId, "scam", "domain:db-test.example");
    expect(await store.clusterCount("domain:db-test.example")).toBeGreaterThanOrEqual(1);

    // The device sees its own pending report with the machine suggestion.
    const mine = await store.listByDevice(device);
    const row = mine.find((r) => r.reportId === reportId);
    expect(row?.status).toBe("pending");
    expect(row?.suggestedVerdict).toBe("scam");

    // Admin verification persists and returns the device token (for the push).
    const verified = await store.verify(reportId, "scam");
    expect(verified?.status).toBe("scam");
    expect(verified?.deviceToken).toBe(device);

    const stats = await store.stats();
    expect(stats.checks).toBeGreaterThanOrEqual(1);
    expect(stats.confirmedScams).toBeGreaterThanOrEqual(1);

    // Admin search + date-range filtering (the Postgres ILIKE / created_at SQL).
    const unique = `zz${randomUUID().replace(/-/g, "")}`;
    const searchId = randomUUID();
    await store.addReport({
      reportId: searchId,
      deviceToken: device,
      channel: "message",
      snippet: `needle ${unique} http://db-test.example`,
      createdAt: new Date().toISOString(),
    });
    const found = await store.listAll({ q: unique });
    expect(found).toHaveLength(1);
    expect(found[0]?.reportId).toBe(searchId);

    // A future lower bound excludes everything.
    expect(await store.listAll({ from: "2999-01-01" })).toHaveLength(0);
  });
});
