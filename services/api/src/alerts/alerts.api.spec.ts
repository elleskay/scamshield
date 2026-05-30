import { beforeAll, afterAll, describe } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";

describe("alerts HTTP API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  test("[SCAM-ALERT-001] the alerts endpoint returns scam advisories", async () => {
    const res = await request(app.getHttpServer()).get("/alerts");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const first = res.body[0];
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("body");
    expect(first).toHaveProperty("category");
    expect(first).toHaveProperty("date");
  });
});
