import { describe, vi } from "vitest";
import { test, expect } from "@platform/spec-test/vitest";
import { ReportsService } from "./reports.service";
import { InMemoryStore } from "./reports.store";
import { ClassifierService } from "../classifier/classifier.service";
import { NumbersService } from "../numbers/numbers.service";
import { OpenSearchService } from "../search/opensearch.service";
import type { PushService } from "../push/push.service";

function makeService() {
  const classifier = new ClassifierService(new NumbersService());
  const search = new OpenSearchService();
  const push = { notifyScam: vi.fn().mockResolvedValue(true) };
  const store = new InMemoryStore();
  const service = new ReportsService(store, classifier, search, push as unknown as PushService);
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

  test("[SCAM-PUSH-001] notifies the reporter when an admin marks their report a scam", async () => {
    const { service, push } = makeService();

    // Submit processes inline (no queue) and records a suggestion, but must not
    // push: the reporter is only told once a human confirms it.
    const { reportId } = await service.submit({
      text: "URGENT verify your bank http://evil.example",
      deviceToken: "ExponentPushToken[abc123]",
    });
    expect(push.notifyScam).not.toHaveBeenCalled();

    // Admin confirms the scam -> the reporter is notified.
    await service.verify(reportId, "scam");
    expect(push.notifyScam).toHaveBeenCalledTimes(1);
    expect(push.notifyScam).toHaveBeenCalledWith("ExponentPushToken[abc123]", reportId);
  });
});
