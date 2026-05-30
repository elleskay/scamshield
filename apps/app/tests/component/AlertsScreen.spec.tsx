import { render, screen } from "@testing-library/react-native";
import { AlertList } from "@/components/AlertList";

test("[SCAM-ALERT-002] alerts tab renders advisories", () => {
  render(
    <AlertList
      alerts={[
        {
          id: "a1",
          title: "Fake bank SMS",
          body: "Do not click the link.",
          category: "Phishing",
          date: "2026-05-24",
        },
      ]}
    />,
  );

  expect(screen.getByTestId("alert-card")).toBeTruthy();
  expect(screen.getByText("Fake bank SMS")).toBeTruthy();
  expect(screen.getByText("Phishing")).toBeTruthy();
});
