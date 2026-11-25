import { type PaymentState, PAYMENT_STATE_LABELS, paymentState } from "@/lib/payment-state";
import type { PaymentStatus } from "@/lib/types";

const STYLES: Record<PaymentState, string> = {
  paid: "bg-paid-bg text-paid",
  awaiting: "bg-requested-bg text-requested",
  notSent: "bg-unpaid-bg text-unpaid",
};

type Props = { order: { payment: PaymentStatus; confirmationSentAt: string | null } };

/** The long label wraps to two lines, so it never squeezes the customer's name on a phone. */
export function PaymentBadge({ order }: Props) {
  const state = paymentState(order);
  return (
    <span
      className={`inline-flex max-w-32 shrink-0 justify-center rounded-2xl px-3 py-1 text-center text-sm leading-tight font-semibold ${STYLES[state]}`}
    >
      {PAYMENT_STATE_LABELS[state]}
    </span>
  );
}
