import type { Verdict } from "./classifier";

// Design tokens. Trust-first palette: a confident indigo/violet brand with clear
// semantic severity colors. Calm, high-contrast, accessible, not trendy-for-its-
// own-sake (this is an anti-scam app, legibility beats novelty).
export const brand = {
  indigo: "#4F46E5",
  violet: "#7C3AED",
  indigoDark: "#3730A3",
};

export const severity: Record<
  Verdict,
  { label: string; color: string; bg: string; icon: string; gradient: [string, string] }
> = {
  scam: {
    label: "Scam",
    color: "#DC2626",
    bg: "#FEF2F2",
    icon: "alert-octagon",
    gradient: ["#EF4444", "#DC2626"],
  },
  suspicious: {
    label: "Suspicious",
    color: "#D97706",
    bg: "#FFFBEB",
    icon: "alert",
    gradient: ["#F59E0B", "#D97706"],
  },
  clean: {
    label: "Looks clean",
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
