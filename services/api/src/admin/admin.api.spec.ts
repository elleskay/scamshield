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
});
