import { describe, vi } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { ReportsService } from "./reports.service";
import { ClassifierService } from "../classifier/classifier.service";
import { OpenSearchService } from "../search/opensearch.service";
import type { PushService } from "../push/push.service";

function makeService() {
  const classifier = new ClassifierService();
  const search = new OpenSearchService();
  const push = { notifyScam: vi.fn().mockResolvedValue(true) };
  const service = new ReportsService(classifier, search, push as unknown as PushService);
  return { service, classifier, push };
}

describe("ReportsService.process", () => {
  test("[SCAM-REPORT-002] processes a report idempotently on duplicate delivery", async () => {
    const { service, classifier } = makeService();
    const classify = vi.spyOn(classifier, "classify");

    const msg = { reportId: "report-1", text: "win a prize http://evil.example", channel: "sms" };
    await service.process(msg);
    await service.process(msg); // duplicate delivery

    expect(classify).toHaveBeenCalledTimes(1);
  });

  test("[SCAM-PUSH-001] notifies the reporter when their report is marked a scam", async () => {
    const { service, push } = makeService();

    await service.process({
      reportId: "report-2",
      text: "URGENT verify your bank http://evil.example",
      deviceToken: "ExponentPushToken[abc123]",
    });

    expect(push.notifyScam).toHaveBeenCalledTimes(1);
    expect(push.notifyScam).toHaveBeenCalledWith("ExponentPushToken[abc123]", "report-2");
  });
});
