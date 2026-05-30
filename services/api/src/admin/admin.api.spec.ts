import { beforeAll, afterAll, describe, vi } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";
import { PushService } from "../push/push.service";

const TOKEN = "test-admin-token";
const auth = { Authorization: `Bearer ${TOKEN}` };

describe("admin verification API", () => {
  let app: INestApplication;
  const push = { notifyScam: vi.fn().mockResolvedValue(true) };

  beforeAll(async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PushService)
      .useValue(push)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  test("[SCAM-ADMIN-001] admin can list all reports with their suggestion and status", async () => {
    await request(app.getHttpServer())
      .post("/reports")
      .send({ text: "win a prize http://evil.example", deviceToken: "d1" });

    const res = await request(app.getHttpServer()).get("/admin/reports").set(auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("status");
    expect(res.body[0]).toHaveProperty("suggestedVerdict");
  });

  test("[SCAM-ADMIN-002] verifying a report sets its status and notifies the reporter", async () => {
    const submit = await request(app.getHttpServer())
      .post("/reports")
      .send({ text: "URGENT verify your bank http://evil.example", deviceToken: "ExponentPushToken[xyz]" });
    const reportId = submit.body.reportId as string;
    push.notifyScam.mockClear();

    const res = await request(app.getHttpServer())
      .patch(`/admin/reports/${reportId}`)
      .set(auth)
      .send({ verdict: "scam" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("scam");
    expect(push.notifyScam).toHaveBeenCalledWith("ExponentPushToken[xyz]", reportId);
  });

  test("[SCAM-ADMIN-003] admin endpoints reject a missing or wrong token", async () => {
    const noToken = await request(app.getHttpServer()).get("/admin/reports");
    expect(noToken.status).toBe(403);

    const badToken = await request(app.getHttpServer())
      .get("/admin/reports")
      .set({ Authorization: "Bearer wrong" });
    expect(badToken.status).toBe(403);
  });

  test("[SCAM-ADMIN-005] admin can search reports by content, status, or device", async () => {
    const marker = `zzmarker${Date.now()}`;
    await request(app.getHttpServer())
      .post("/reports")
      .send({ text: `please ${marker} confirm http://evil.example`, deviceToken: "d-search" });

    const hit = await request(app.getHttpServer())
      .get("/admin/reports")
      .query({ q: marker })
      .set(auth);
    expect(hit.status).toBe(200);
    expect(hit.body.length).toBeGreaterThan(0);
    expect(
      hit.body.every((r: { snippet: string }) => r.snippet.toLowerCase().includes(marker)),
    ).toBe(true);

    // A query that matches nothing returns an empty list.
    const miss = await request(app.getHttpServer())
      .get("/admin/reports")
      .query({ q: "no-such-content-xyzzy" })
      .set(auth);
    expect(miss.body).toHaveLength(0);
  });

  test("[SCAM-ADMIN-006] admin can export reports as CSV by date range", async () => {
    await request(app.getHttpServer())
      .post("/reports")
      .send({ text: "export me http://evil.example", deviceToken: "d-export" });

    const csv = await request(app.getHttpServer()).get("/admin/reports/export").set(auth);
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    const lines = csv.text.trim().split("\n");
    expect(lines[0]).toBe("reportId,createdAt,channel,status,suggestedVerdict,snippet");
    expect(lines.length).toBeGreaterThan(1);

    // A future lower bound filters everything out, leaving only the header.
    const future = await request(app.getHttpServer())
      .get("/admin/reports/export")
      .query({ from: "2099-01-01" })
      .set(auth);
    expect(future.text.trim().split("\n")).toHaveLength(1);
  });

  test("[SCAM-BLOCK-001] admin can upload scam numbers to the blocklist", async () => {
    const num = "6591234567";

    // Without a valid token it is rejected and nothing changes.
    const noauth = await request(app.getHttpServer())
      .post("/admin/blocklist")
      .send({ numbers: [num] });
    expect(noauth.status).toBe(403);

    // Admin uploads the number (formatted input is normalized).
    const up = await request(app.getHttpServer())
      .post("/admin/blocklist")
      .set(auth)
      .send({ numbers: ["+65 9123 4567"] });
    expect(up.status).toBe(200);
    expect(up.body.added).toBeGreaterThanOrEqual(1);

    // It now appears in the synced blocklist...
    const list = await request(app.getHttpServer()).get("/numbers/blocklist");
    expect(list.body.numbers.map(String)).toContain(num);

    // ...and a check of that number returns scam.
    const check = await request(app.getHttpServer()).post("/numbers/check").send({ number: num });
    expect(check.body.verdict).toBe("scam");
  });
});
