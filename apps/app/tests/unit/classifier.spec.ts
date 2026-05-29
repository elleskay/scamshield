import { localHeuristic } from "../../lib/classifier";

test("[SCAM-CLASSIFY-001] link plus lure is classified as scam with score >= 0.8", () => {
  const r = localHeuristic("URGENT: verify your bank account now http://evil.example/login");
  expect(r.verdict).toBe("scam");
  expect(r.score).toBeGreaterThanOrEqual(0.8);
});

test("[SCAM-CHECK-002] an ordinary message is reported clean", () => {
  const r = localHeuristic("hey, are we still on for lunch tomorrow?");
  expect(r.verdict).toBe("clean");
});
