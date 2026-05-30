import { beforeAll, afterAll, describe } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";

describe("stats + clustering API", () => {
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

  test("[SCAM-STATS-001] the stats endpoint returns usage counters", async () => {
    await request(app.getHttpServer()).post("/reports/check").send({ text: "hello there" });

    const res = await request(app.getHttpServer()).get("/stats");
    expect(res.status).toBe(200);
    expect(typeof res.body.checks).toBe("number");
    expect(typeof res.body.reports).toBe("number");
    expect(typeof res.body.confirmedScams).toBe("number");
    expect(res.body.checks).toBeGreaterThan(0);
  });

  test("[SCAM-CLUSTER-001] similar reports cluster and surface a reported count", async () => {
    await request(app.getHttpServer())
      .post("/reports")
      .send({ text: "win a prize http://scamsite.example", deviceToken: "a" });
    await request(app.getHttpServer())
      .post("/reports")
      .send({ text: "claim now http://scamsite.example", deviceToken: "b" });

    // Checking content with the same scam-link domain reports how many similar
    // reports we have seen.
    const check = await request(app.getHttpServer())
      .post("/reports/check")
      .send({ text: "verify your account http://scamsite.example" });
    expect(check.status).toBe(200);
    expect(check.body.reportedCount).toBeGreaterThanOrEqual(2);
  });
});
