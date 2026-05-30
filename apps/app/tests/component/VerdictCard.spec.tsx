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

test("[SCAM-SENDER-002] the verdict card shows a verified-sender badge and label", () => {
  render(
    <VerdictCard
      verdict="clean"
      score={0.05}
      reason="Registered sender."
      trustedSender="CPF Board"
    />,
  );

  expect(screen.getByTestId("verified-sender-badge")).toBeTruthy();
  expect(screen.getByText("Verified sender")).toBeTruthy();
  expect(screen.getByText("CPF Board")).toBeTruthy();
});

test("[SCAM-WHY-002] the verdict card explains why a message was flagged", () => {
  render(
    <VerdictCard
      verdict="scam"
      score={0.9}
      reason="Contains a link and urgency/lure language."
      signals={["Contains a link", "Urgency or sensitive-info language"]}
    />,
  );

  expect(screen.getByTestId("signals")).toBeTruthy();
  expect(screen.getByText("Why this result")).toBeTruthy();
  expect(screen.getByText("Contains a link")).toBeTruthy();
  expect(screen.getByText("Urgency or sensitive-info language")).toBeTruthy();
});
