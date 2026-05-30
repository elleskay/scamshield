/**
 * Pure block decision, mirrored by the native CallScreeningService.shouldBlock
 * (Kotlin) and the CallDirectory loader (Swift). Kept dependency-free so it is
 * unit-testable without pulling in native modules. The sync that writes the
 * blocklist to disk lives in blocklist-sync.ts (it needs expo-file-system).
 */
export function shouldBlockNumber(blocklist: readonly string[], rawNumber: string): boolean {
  const digits = rawNumber.replace(/\D/g, "");
  if (!digits) return false;
  return blocklist.some((n) => n.replace(/\D/g, "") === digits);
}
