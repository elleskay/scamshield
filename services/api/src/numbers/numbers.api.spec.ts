import { beforeAll, afterAll, describe } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";

describe("numbers HTTP API", () => {
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

  test("[SCAM-CALL-001] the check-number endpoint classifies a phone number", async () => {
    const scam = await request(app.getHttpServer())
      .post("/numbers/check")
      .send({ number: "+65 8000 1234" });
    expect(scam.status).toBe(200);
    expect(scam.body.verdict).toBe("scam");
    expect(scam.body.isVerifiedCaller).toBe(false);

    const verified = await request(app.getHttpServer())
      .post("/numbers/check")
      .send({ number: "1800-000-1111" });
    expect(verified.status).toBe(200);
    expect(verified.body.verdict).toBe("clean");
    expect(verified.body.isVerifiedCaller).toBe(true);
    expect(verified.body.label).toBe("CPF Board");

    const bad = await request(app.getHttpServer())
      .post("/numbers/check")
      .send({ number: "no-digits-here!!" });
    expect(bad.status).toBe(400);

    const blocklist = await request(app.getHttpServer()).get("/numbers/blocklist");
    expect(blocklist.status).toBe(200);
    expect(Array.isArray(blocklist.body.numbers)).toBe(true);
    expect(blocklist.body.numbers).toContain(6580001234);
  });
});
