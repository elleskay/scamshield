import { defineConfig } from "@playwright/test";

// The admin app must be built with VITE_API_URL pointing at the running API, then
// previewed on :4173. The API is started separately (by the CI job / locally).
export default defineConfig({
  testDir: "./tests",
  reporter: "list",
  use: { baseURL: process.env.ADMIN_URL ?? "http://localhost:4173" },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
