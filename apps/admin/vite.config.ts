import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served under the Pages site at /scamshield/admin/ in production; root in dev.
// VITE_BASE overrides it (the Playwright e2e builds with base "/").
export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE ?? (command === "build" ? "/scamshield/admin/" : "/"),
  plugins: [react()],
}));
