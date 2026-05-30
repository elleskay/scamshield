import { render, screen } from "@testing-library/react-native";
import { StatsStrip } from "@/components/StatsStrip";

test("[SCAM-STATS-002] the stats strip renders the usage counters", () => {
  render(<StatsStrip stats={{ checks: 1200, reports: 34, confirmedScams: 5 }} />);

  expect(screen.getByTestId("stats-strip")).toBeTruthy();
  expect(screen.getByText("1.2k")).toBeTruthy();
  expect(screen.getByText("34")).toBeTruthy();
  expect(screen.getByText("5")).toBeTruthy();
});
