import { test, expect } from "@platform/spec-test/playwright";

const API = process.env.VITE_API_URL ?? "http://localhost:3000";
const TOKEN = process.env.ADMIN_TOKEN ?? "test-admin-token";

test("[SCAM-ADMIN-004] an admin reviews a report in the dashboard", async ({ page, request }) => {
  // Seed a fresh pending report via the API (newest, so it lands in the first row).
  await request.post(`${API}/reports`, {
    data: { text: "URGENT verify your bank http://evil.example", deviceToken: "playwright-admin" },
  });

  await page.goto("/");
  await page.getByTestId("token-input").fill(TOKEN);
  await page.getByTestId("sign-in").click();

  const row = page.getByTestId("report-row").first();
  await expect(row).toBeVisible();
  await expect(row.getByTestId("report-status")).toHaveText("Pending");

  await row.getByTestId("mark-scam").click();
  await expect(row.getByTestId("report-status")).toHaveText("Scam");
});
