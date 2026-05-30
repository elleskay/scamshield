import type { Verdict } from "./classifier";

// Design tokens. Trust-first **blue** brand (echoing Singapore's ScamShield's
// calm, government-grade blue) with clear semantic outcome colors and friendly,
// conversational labels. Legibility and reassurance over novelty.
export const brand = {
  primary: "#1D4ED8", // royal blue
  primaryDeep: "#1E3A8A",
  accent: "#3B82F6",
};

export const severity: Record<
  Verdict,
  { label: string; color: string; bg: string; icon: string; gradient: [string, string] }
> = {
  scam: {
    label: "Beware, this looks like a scam",
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "alert-octagon",
    gradient: ["#EF4444", "#DC2626"],
  },
  suspicious: {
    label: "Be careful, we're not sure about this",
    color: "#D97706",
    bg: "#FFFBEB",
    icon: "alert",
    gradient: ["#F59E0B", "#D97706"],
  },
  spam: {
    label: "This looks like spam",
    color: "#475569",
    bg: "#F1F5F9",
    icon: "bullhorn-outline",
    gradient: ["#64748B", "#475569"],
  },
  clean: {
    label: "This looks safe",
    color: "#059669",
    bg: "#ECFDF5",
    icon: "shield-check",
    gradient: ["#10B981", "#059669"],
  },
};

export function palette(dark: boolean) {
  return {
    bg: dark ? "#0B1120" : "#F1F5F9",
    surface: dark ? "#111827" : "#FFFFFF",
    surfaceAlt: dark ? "#1F2937" : "#F8FAFC",
    border: dark ? "#1F2937" : "#E2E8F0",
    text: dark ? "#F8FAFC" : "#0F172A",
    textMuted: dark ? "#94A3B8" : "#64748B",
    inputBg: dark ? "#0F172A" : "#FFFFFF",
  };
}
