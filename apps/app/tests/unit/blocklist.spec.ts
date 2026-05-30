import { shouldBlockNumber } from "../../lib/blocklist";

test("[SCAM-NATIVE-001] the block decision matches the synced scam blocklist", () => {
  const blocklist = ["6580001234", "18005550199"];

  // Matches regardless of the caller's formatting (digits only).
  expect(shouldBlockNumber(blocklist, "+65 8000 1234")).toBe(true);
  expect(shouldBlockNumber(blocklist, "1800-555-0199")).toBe(true);

  // Unknown numbers and empty input are not blocked.
  expect(shouldBlockNumber(blocklist, "9999999")).toBe(false);
  expect(shouldBlockNumber(blocklist, "")).toBe(false);
});
