import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import CheckScreen from "@/app/(tabs)/index";

jest.mock("@/lib/api", () => ({
  checkMessage: jest.fn(),
  checkEmail: jest.fn(),
  submitReport: jest.fn(),
  checkNumber: jest.fn(async () => ({
    verdict: "clean",
    score: 0.02,
    reason: "Verified caller: CPF Board.",
    isVerifiedCaller: true,
    label: "CPF Board",
  })),
}));

test("[SCAM-CHECK-003] check button is disabled until a message is entered", () => {
  render(<CheckScreen />);

  const button = screen.getByTestId("check-button");
  expect(button).toBeDisabled();

  fireEvent.changeText(screen.getByTestId("message-input"), "suspicious text");
  expect(button).toBeEnabled();
});

test("[SCAM-CALL-003] number mode shows a verdict and marks verified callers", async () => {
  render(<CheckScreen />);

  fireEvent.press(screen.getByTestId("mode-number"));
  fireEvent.changeText(screen.getByTestId("number-input"), "1800-000-1111");
  fireEvent.press(screen.getByTestId("check-button"));

  await waitFor(() => {
    expect(screen.getByTestId("verdict")).toBeTruthy();
    expect(screen.getByTestId("verified-badge")).toBeTruthy();
  });
});
