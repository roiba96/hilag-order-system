import { describe, expect, it } from "vitest";
import { paymentBeforePaid, paymentLabel, paymentState } from "./payment-state";

const SENT = "2026-11-24T10:00:00Z";

describe("paymentState / paymentLabel", () => {
  it("unpaid and no summary sent", () => {
    expect(paymentState({ payment: "unpaid", confirmationSentAt: null })).toBe("notSent");
    expect(paymentLabel({ payment: "unpaid", confirmationSentAt: null })).toBe("לא נשלח סיכום");
  });

  it("requested, with or without a summary time", () => {
    for (const confirmationSentAt of [null, SENT]) {
      expect(paymentLabel({ payment: "requested", confirmationSentAt })).toBe("נשלח סיכום, ממתין לתשלום");
    }
  });

  it("unpaid but the summary was sent counts as sent", () => {
    expect(paymentLabel({ payment: "unpaid", confirmationSentAt: SENT })).toBe("נשלח סיכום, ממתין לתשלום");
  });

  it("paid, whatever was sent", () => {
    for (const confirmationSentAt of [null, SENT]) {
      expect(paymentLabel({ payment: "paid", confirmationSentAt })).toBe("שולם");
    }
  });
});

describe("paymentBeforePaid", () => {
  it("goes back to 'requested' only if something was sent", () => {
    expect(paymentBeforePaid({ confirmationSentAt: SENT, paymentRequestedAt: null })).toBe("requested");
    expect(paymentBeforePaid({ confirmationSentAt: null, paymentRequestedAt: SENT })).toBe("requested");
    expect(paymentBeforePaid({ confirmationSentAt: null, paymentRequestedAt: null })).toBe("unpaid");
  });
});
