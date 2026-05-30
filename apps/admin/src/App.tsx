import { useCallback, useEffect, useState } from "react";
import {
  addToBlocklist,
  exportReportsCsv,
  listReports,
  verifyReport,
  type AdminReport,
  type ReportStatus,
} from "./api";

const STATUS: Record<ReportStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#475569", bg: "#F1F5F9" },
  scam: { label: "Scam", color: "#B91C1C", bg: "#FEF2F2" },
  suspicious: { label: "Suspicious", color: "#B45309", bg: "#FFFBEB" },
  spam: { label: "Spam", color: "#475569", bg: "#F1F5F9" },
  clean: { label: "Clean", color: "#047857", bg: "#ECFDF5" },
};

export function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("admin.token") ?? "");
  const [signedIn, setSignedIn] = useState<boolean>(() => !!localStorage.getItem("admin.token"));

  if (!signedIn) {
    return (
      <Login
        onSignIn={(t) => {
          localStorage.setItem("admin.token", t);
          setToken(t);
          setSignedIn(true);
        }}
      />
    );
  }

  return (
    <Dashboard
      token={token}
      onSignOut={() => {
        localStorage.removeItem("admin.token");
        setSignedIn(false);
      }}
    />
  );
}

function Login({ onSignIn }: { onSignIn: (token: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div style={S.page}>
      <div style={S.loginCard}>
        <h1 style={S.brand}>ScamShield Admin</h1>
        <p style={S.muted}>Verification dashboard (unofficial demo). Enter the admin token.</p>
        <input
          data-testid="token-input"
          style={S.input}
          type="password"
          placeholder="Admin token"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value && onSignIn(value)}
        />
        <button data-testid="sign-in" style={S.primaryBtn} disabled={!value} onClick={() => onSignIn(value)}>
          Sign in
        </button>
      </div>
    </div>
  );
}

function Dashboard({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setReports(await listReports(token, search));
      setError(null);
    } catch {
      setError("Could not load reports. Check the token.");
    }
  }, [token, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, verdict: "scam" | "suspicious" | "clean" | "spam") {
    const updated = await verifyReport(token, id, verdict);
    setReports((prev) => prev?.map((r) => (r.reportId === id ? updated : r)) ?? null);
  }

  async function exportCsv() {
    const csv = await exportReportsCsv(token, search);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "scamshield-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const [blockInput, setBlockInput] = useState("");
  const [blockMsg, setBlockMsg] = useState<string | null>(null);
  async function uploadBlocklist() {
    // Split on comma / semicolon / newline only, NOT spaces: a number like
    // "+65 9888 7777" contains spaces as formatting and must stay one entry.
    const numbers = blockInput
      .split(/[,;\n]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (numbers.length === 0) return;
    try {
      const { added, total } = await addToBlocklist(token, numbers);
      setBlockMsg(`Added ${added} number(s). Blocklist now has ${total}.`);
      setBlockInput("");
    } catch {
      setBlockMsg("Upload failed. Check the token.");
    }
  }

  return (
    <div style={S.page}>
      <div style={S.shell}>
        <header style={S.header}>
          <div>
            <h1 style={S.brand}>ScamShield Admin</h1>
            <p style={S.muted}>Review reported scams and confirm a verdict. The reporter is notified.</p>
          </div>
          <button style={S.ghostBtn} onClick={onSignOut}>
            Sign out
          </button>
        </header>

        {error && <p style={S.error}>{error}</p>}

        <div style={S.toolbar}>
          <form
            style={S.searchForm}
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
            }}
          >
            <input
              data-testid="search-input"
              style={S.search}
              placeholder="Search content, status, channel, or device"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button data-testid="search-btn" style={S.ghostBtn} type="submit">
              Search
            </button>
            {search && (
              <button
                style={S.ghostBtn}
                type="button"
                onClick={() => {
                  setQuery("");
                  setSearch("");
                }}
              >
                Clear
              </button>
            )}
          </form>
          <button data-testid="export-csv" style={S.primaryBtn} onClick={() => void exportCsv()}>
            Export CSV
          </button>
        </div>

        <div style={S.blockPanel}>
          <span style={S.muted}>Add scam numbers to the blocklist (space or comma separated):</span>
          <div style={S.blockRow}>
            <input
              data-testid="blocklist-input"
              style={S.search}
              placeholder="e.g. +65 9123 4567, 65900012345"
              value={blockInput}
              onChange={(e) => setBlockInput(e.target.value)}
            />
            <button
              data-testid="blocklist-add"
              style={S.ghostBtn}
              disabled={!blockInput.trim()}
              onClick={() => void uploadBlocklist()}
            >
              Add to blocklist
            </button>
          </div>
          {blockMsg && <span style={S.muted}>{blockMsg}</span>}
        </div>

        {reports && reports.length > 0 ? (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Reported content</th>
                <th style={S.th}>Channel</th>
                <th style={S.th}>Suggested</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Review</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.reportId} data-testid="report-row" style={S.tr}>
                  <td style={S.td}>{r.snippet}</td>
                  <td style={{ ...S.td, ...S.muted }}>{r.channel ?? "message"}</td>
                  <td style={{ ...S.td, ...S.muted }}>{r.suggestedVerdict ?? "—"}</td>
                  <td style={S.td}>
                    <span
                      data-testid="report-status"
                      style={{ ...S.badge, color: STATUS[r.status].color, background: STATUS[r.status].bg }}
                    >
                      {STATUS[r.status].label}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={S.actions}>
                      <button data-testid="mark-scam" style={S.scamBtn} onClick={() => void review(r.reportId, "scam")}>
                        Scam
                      </button>
                      <button style={S.susBtn} onClick={() => void review(r.reportId, "suspicious")}>
                        Suspicious
                      </button>
                      <button style={S.spamBtn} onClick={() => void review(r.reportId, "spam")}>
                        Spam
                      </button>
                      <button style={S.cleanBtn} onClick={() => void review(r.reportId, "clean")}>
                        Clean
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={S.muted}>
            {reports ? (search ? "No reports match your search." : "No reports yet.") : "Loading…"}
          </p>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F8FAFC",
    color: "#0F172A",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: 24,
  },
  shell: { maxWidth: 980, margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  brand: { fontSize: 22, fontWeight: 800, margin: 0, color: "#4F46E5" },
  muted: { color: "#64748B", fontSize: 14, margin: "4px 0 0" },
  error: { color: "#B91C1C", fontSize: 14 },
  toolbar: { display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  searchForm: { display: "flex", gap: 8, flex: 1, minWidth: 260 },
  search: { flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid #CBD5E1", fontSize: 14 },
  blockPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 16,
    padding: 12,
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
  },
  blockRow: { display: "flex", gap: 8 },
  loginCard: {
    maxWidth: 360,
    margin: "12vh auto 0",
    background: "#fff",
    border: "1px solid #E2E8F0",
    borderRadius: 16,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: { padding: "10px 12px", borderRadius: 10, border: "1px solid #CBD5E1", fontSize: 15 },
  primaryBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "#4F46E5",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  ghostBtn: { padding: "8px 12px", borderRadius: 10, border: "1px solid #CBD5E1", background: "#fff", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12 },
  th: { textAlign: "left", fontSize: 12, color: "#64748B", padding: "12px 14px", borderBottom: "1px solid #E2E8F0" },
  tr: { borderBottom: "1px solid #F1F5F9" },
  td: { padding: "12px 14px", fontSize: 14, verticalAlign: "middle" },
  badge: { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99 },
  actions: { display: "flex", gap: 6 },
  scamBtn: { padding: "6px 10px", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", cursor: "pointer" },
  susBtn: { padding: "6px 10px", borderRadius: 8, border: "none", background: "#D97706", color: "#fff", cursor: "pointer" },
  spamBtn: { padding: "6px 10px", borderRadius: 8, border: "none", background: "#64748B", color: "#fff", cursor: "pointer" },
  cleanBtn: { padding: "6px 10px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", cursor: "pointer" },
};
