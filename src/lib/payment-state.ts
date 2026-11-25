// The payment badge: one wording everywhere (lists, Today, Payments, queues, CSV). Pure.
import type { PaymentStatus } from "./types";

type PaymentFacts = { payment: PaymentStatus; confirmationSentAt: string | null };

export type PaymentState = "notSent" | "awaiting" | "paid";

export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  notSent: "לא נשלח סיכום",
  awaiting: "נשלח סיכום, ממתין לתשלום",
  paid: "שולם",
};

/** An 'unpaid' order whose summary did go out (confirmation_sent_at) is awaiting payment too. */
export function paymentState({ payment, confirmationSentAt }: PaymentFacts): PaymentState {
  if (payment === "paid") return "paid";
  return payment === "requested" || confirmationSentAt !== null ? "awaiting" : "notSent";
}

export function paymentLabel(facts: PaymentFacts): string {
  return PAYMENT_STATE_LABELS[paymentState(facts)];
}

/**
 * What payment goes back to when a "paid" mark is removed long after the undo toast: 'requested'
 * only if a summary or payment request really went out, so the badge never claims one that didn't.
 */
export function paymentBeforePaid(order: {
  confirmationSentAt: string | null;
  paymentRequestedAt: string | null;
}): PaymentStatus {
  return order.confirmationSentAt !== null || order.paymentRequestedAt !== null ? "requested" : "unpaid";
}
