import { localHeuristic, localNumberHeuristic, localEmailHeuristic } from "../../lib/classifier";

test("[SCAM-CLASSIFY-001] link plus lure is classified as scam with score >= 0.8", () => {
  const r = localHeuristic("URGENT: verify your bank account now http://evil.example/login");
  expect(r.verdict).toBe("scam");
  expect(r.score).toBeGreaterThanOrEqual(0.8);
});

test("[SCAM-CHECK-002] an ordinary message is reported clean", () => {
  const r = localHeuristic("hey, are we still on for lunch tomorrow?");
  expect(r.verdict).toBe("clean");
});

test("[SCAM-CLASSIFY-003] unsolicited promotional content is classified as spam", () => {
  const r = localHeuristic("HUGE SALE! 50% off everything. Limited time only. Unsubscribe here.");
  expect(r.verdict).toBe("spam");

  // A phishing message is still a scam, not spam.
  const scam = localHeuristic("URGENT verify your bank account http://evil.example");
  expect(scam.verdict).toBe("scam");
});

test("[SCAM-CALL-002] known scam and verified-caller numbers are classified", () => {
  const scam = localNumberHeuristic("+65 8000 1234");
  expect(scam.verdict).toBe("scam");
  expect(scam.isVerifiedCaller).toBe(false);

  const gov = localNumberHeuristic("1800-000-1111");
  expect(gov.verdict).toBe("clean");
  expect(gov.isVerifiedCaller).toBe(true);
  expect(gov.label).toBe("CPF Board");
});

test("[SCAM-EMAIL-002] the email heuristic flags a spoofed-sender lure", () => {
  const r = localEmailHeuristic("From: support@paypa1.com — please verify your account now.");
  expect(r.verdict).toBe("scam");

  const ok = localEmailHeuristic("From: mum@gmail.com see you for lunch tomorrow");
  expect(ok.verdict).toBe("clean");
});

test("[SCAM-SENDER-001] a message from a trusted registered sender is verified", () => {
  // A registered Sender ID (case/format-insensitive) is trusted.
  const r = localHeuristic("Your CPF contribution has been credited.", { sender: "CPF" });
  expect(r.verdict).toBe("clean");
  expect(r.trustedSender).toBe("CPF Board");

  // An unknown sender gets no trusted treatment.
  const unknown = localHeuristic("Your account statement is ready.", { sender: "DBS-PROMO" });
  expect(unknown.trustedSender).toBeUndefined();
});

test("[SCAM-NUMINMSG-001] a message containing a known scam number is flagged", () => {
  const r = localHeuristic("Hi, please call our officer at +65 8000 1234 to clear your parcel.");
  expect(r.verdict).toBe("scam");
  expect(r.flaggedNumber).toBe("6580001234");

  // An ordinary number in a message is not flagged.
  const ok = localHeuristic("Call me at 9123 4567 when you reach.");
  expect(ok.flaggedNumber).toBeUndefined();
});

test("[SCAM-OTP-001] a legitimate one-time passcode message is not flagged", () => {
  // A genuine OTP with no link is clean (not suspicious), despite the word "OTP".
  const otp = localHeuristic("Your OTP is 458213. Do not share it with anyone.");
  expect(otp.verdict).toBe("clean");

  // An OTP-themed phishing message that carries a link is still a scam.
  const phish = localHeuristic("Your OTP is 123456, verify now at http://evil.example/login");
  expect(phish.verdict).toBe("scam");
});

test("[SCAM-WHY-001] the classifier returns the signals behind a verdict", () => {
  const r = localHeuristic("URGENT: verify your account at http://evil.example/login");
  expect(r.verdict).toBe("scam");
  expect(r.signals).toContain("Contains a link");
  expect(r.signals).toContain("Urgency or sensitive-info language");
});
