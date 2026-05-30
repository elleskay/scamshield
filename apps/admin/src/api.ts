const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type ReportStatus = "pending" | "scam" | "suspicious" | "clean" | "spam";

export interface AdminReport {
  reportId: string;
  status: ReportStatus;
  suggestedVerdict: "scam" | "suspicious" | "clean" | "spam" | null;
  channel?: string;
  snippet: string;
  createdAt: string;
}

export async function listReports(token: string, q?: string): Promise<AdminReport[]> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const res = await fetch(`${API_URL}/admin/reports${qs}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return (await res.json()) as AdminReport[];
}

/** Fetch reports as a CSV document (optionally filtered by the search query). */
export async function exportReportsCsv(token: string, q?: string): Promise<string> {
  const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
  const res = await fetch(`${API_URL}/admin/reports/export${qs}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`export failed: ${res.status}`);
  return await res.text();
}

/** Upload scam numbers to the blocklist. Returns how many were newly added. */
export async function addToBlocklist(
  token: string,
  numbers: string[],
): Promise<{ added: number; total: number }> {
  const res = await fetch(`${API_URL}/admin/blocklist`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ numbers }),
  });
  if (!res.ok) throw new Error(`blocklist upload failed: ${res.status}`);
  return (await res.json()) as { added: number; total: number };
}

export async function verifyReport(
  token: string,
  reportId: string,
  verdict: "scam" | "suspicious" | "clean" | "spam",
): Promise<AdminReport> {
  const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ verdict }),
  });
  if (!res.ok) throw new Error(`verify failed: ${res.status}`);
  return (await res.json()) as AdminReport;
}
