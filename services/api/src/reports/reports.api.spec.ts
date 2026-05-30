import { beforeAll, afterAll, describe } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";

describe("reports HTTP API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  test("[SCAM-API-001] the check endpoint classifies a message", async () => {
    const res = await request(app.getHttpServer())
      .post("/reports/check")
      .send({ text: "URGENT verify your bank http://evil.example" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("verdict");
    expect(res.body).toHaveProperty("score");
    expect(res.body).toHaveProperty("reason");
  });

  test("[SCAM-API-002] the check endpoint rejects invalid input", async () => {
    const empty = await request(app.getHttpServer()).post("/reports/check").send({});
    expect(empty.status).toBe(400);

    const unknownField = await request(app.getHttpServer())
      .post("/reports/check")
      .send({ text: "hi", admin: true });
    expect(unknownField.status).toBe(400);
  });

  test("[SCAM-SENDER-003] the check endpoint recognizes a trusted sender", async () => {
    const res = await request(app.getHttpServer())
      .post("/reports/check")
      .send({ text: "Your CPF contribution has been credited.", sender: "CPF" });
    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("clean");
    expect(res.body.trustedSender).toBe("CPF Board");
  });

  test("[SCAM-NUMINMSG-002] the check endpoint flags a known scam number in a message", async () => {
    const res = await request(app.getHttpServer())
      .post("/reports/check")
      .send({ text: "Call our officer at +65 8000 1234 to clear your parcel." });
    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("scam");
    expect(res.body.flaggedNumber).toBe("6580001234");
  });

  test("[SCAM-REPORT-003] a device can list its own reports with status", async () => {
    const deviceToken = `dev-${Date.now()}`;

    const submit = await request(app.getHttpServer())
      .post("/reports")
      .send({
        text: "You won a prize, claim now http://evil.example",
        channel: "message",
        deviceToken,
      });
    expect(submit.status).toBe(201);
    const reportId = submit.body.reportId as string;

    // Processed inline (no queue), but a report stays "pending" until a human
    // reviews it; the classifier's call is exposed as suggestedVerdict.
    const list = await request(app.getHttpServer()).get("/reports").query({ deviceToken });
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    const mine = list.body.find((r: { reportId: string }) => r.reportId === reportId);
    expect(mine).toBeTruthy();
    expect(mine.status).toBe("pending");
    expect(mine.suggestedVerdict).toBe("scam");
    expect(typeof mine.snippet).toBe("string");

    // Another device does not see it.
    const other = await request(app.getHttpServer())
      .get("/reports")
      .query({ deviceToken: "someone-else" });
    expect(other.body.find((r: { reportId: string }) => r.reportId === reportId)).toBeFalsy();
  });
});
