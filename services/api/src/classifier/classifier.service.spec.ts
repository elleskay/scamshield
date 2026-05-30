import { beforeAll, afterAll, describe } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { createServer, type Server } from "node:http";
import { ClassifierService } from "./classifier.service";
import { NumbersService } from "../numbers/numbers.service";
import { InMemoryStore } from "../reports/reports.store";

describe("ClassifierService LLM integration", () => {
  let server: Server;
  let url: string;
  let handler: (status: number, body: string) => void = () => {};
  let respond: { status: number; body: string } = { status: 200, body: "{}" };

  beforeAll(async () => {
    handler = (status, body) => {
      respond = { status, body };
    };
    server = createServer((_req, res) => {
      res.writeHead(respond.status, { "content-type": "application/json" });
      res.end(respond.body);
    });
    await new Promise<void>((r) => server.listen(0, () => r()));
    const addr = server.address();
    url = `http://localhost:${typeof addr === "object" && addr ? addr.port : 0}`;
  });

  afterAll(async () => {
    delete process.env.CLASSIFIER_API_URL;
    delete process.env.CLASSIFIER_API_KEY;
    await new Promise<void>((r) => server.close(() => r()));
  });

  test("[SCAM-CLASSIFY-002] uses the LLM when configured and falls back on error", async () => {
    process.env.CLASSIFIER_API_URL = url;
    process.env.CLASSIFIER_API_KEY = "test-key";

    // Configured endpoint returns a verdict -> the LLM result is used.
    handler(200, JSON.stringify({ verdict: "scam", score: 0.99, reason: "model says scam" }));
    const fromLlm = await new ClassifierService(new NumbersService(new InMemoryStore())).classify(
      "anything",
    );
    expect(fromLlm.source).toBe("llm");
    expect(fromLlm.verdict).toBe("scam");

    // Endpoint errors -> deterministic heuristic fallback (API stays functional).
    handler(500, "boom");
    const fallback = await new ClassifierService(new NumbersService(new InMemoryStore())).classify(
      "URGENT verify http://evil.example",
    );
    expect(fallback.source).toBe("heuristic");
    expect(fallback.verdict).toBe("scam");
  });
});
