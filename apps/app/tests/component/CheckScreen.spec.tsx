import { render, screen, fireEvent } from "@testing-library/react-native";
import CheckScreen from "@/app/index";

test("[SCAM-CHECK-003] check button is disabled until a message is entered", () => {
  render(<CheckScreen />);

  const button = screen.getByTestId("check-button");
  expect(button).toBeDisabled();

  fireEvent.changeText(screen.getByTestId("message-input"), "suspicious text");
  expect(button).toBeEnabled();
});
