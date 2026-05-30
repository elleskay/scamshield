import { render, screen } from "@testing-library/react-native";
import { VerdictCard } from "@/components/VerdictCard";

test("[SCAM-VERDICT-001] the verdict card shows a conversational label, spam education, and AI attribution", () => {
  render(<VerdictCard verdict="spam" score={0.4} reason="Promotional content." />);

  expect(screen.getByTestId("verdict")).toBeTruthy();
  // Conversational outcome label (not a single word).
  expect(screen.getByText("This looks like spam")).toBeTruthy();
  // AI attribution.
  expect(screen.getByText("Assessed by AI")).toBeTruthy();
  // Scam-vs-spam education.
  expect(screen.getByText(/not necessarily a scam/i)).toBeTruthy();
});
