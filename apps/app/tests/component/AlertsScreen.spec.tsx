import { render, screen, waitFor } from "@testing-library/react-native";
import AlertsScreen from "@/app/(tabs)/alerts";

jest.mock("@/lib/api", () => ({
  listAlerts: jest.fn(async () => [
    {
      id: "a1",
      title: "Fake bank SMS",
      body: "Do not click the link.",
      category: "Phishing",
      date: "2026-05-24",
    },
  ]),
}));

test("[SCAM-ALERT-002] alerts tab renders advisories", async () => {
  render(<AlertsScreen />);

  await waitFor(
    () => {
      expect(screen.getByTestId("alert-card")).toBeTruthy();
      expect(screen.getByText("Fake bank SMS")).toBeTruthy();
    },
    { timeout: 10000 },
  );
});
