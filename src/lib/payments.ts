// Payment math and lists for the Payments screen. Pure. Cancelled orders never count.
import { paymentState } from "./payment-state";
import type { OrderStatus, PaymentStatus } from "./types";

type PayOrder = {
  id: number;
  day: string;
  status: OrderStatus;
  payment: PaymentStatus;
  total: number;
  confirmationSentAt: string | null;
  paymentRequestedAt: string | null;
  createdAt: string;
};

export type PaymentTotals = {
  /** Everything that should be paid (whole shekels). */
  expected: number;
  collected: number;
  paidCount: number;
  unpaidCount: number;
  unpaidSum: number;
};

const active = <T extends PayOrder>(orders: T[]) => orders.filter((o) => o.status !== "cancelled");

export function paymentTotals(orders: PayOrder[]): PaymentTotals {
  const totals = { expected: 0, collected: 0, paidCount: 0, unpaidCount: 0, unpaidSum: 0 };
  for (const order of active(orders)) {
    totals.expected += order.total;
    if (order.payment === "paid") {
      totals.collected += order.total;
      totals.paidCount += 1;
    } else {
      totals.unpaidCount += 1;
      totals.unpaidSum += order.total;
    }
  }
  return totals;
}

const byDayThenCreated = (a: PayOrder, b: PayOrder) =>
  a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt);

/** Not-paid orders; those already asked to pay first (or last), each group by day. */
export function unpaidOrders<T extends PayOrder>(orders: T[], requestedFirst: boolean): T[] {
  const rank = (o: PayOrder) => ((paymentState(o) === "awaiting") === requestedFirst ? 0 : 1);
  return active(orders)
    .filter((o) => o.payment !== "paid")
    .sort((a, b) => rank(a) - rank(b) || byDayThenCreated(a, b));
}

export function paidOrders<T extends PayOrder>(orders: T[]): T[] {
  return active(orders)
    .filter((o) => o.payment === "paid")
    .sort(byDayThenCreated);
}

/**
 * The reminder queue: not-paid orders not reminded since the queue started (`since`, ISO),
 * minus the ones the baker skipped. Derived from saved data, so it survives reloads and the
 * trips to WhatsApp and back.
 */
export function reminderQueue<T extends PayOrder>(orders: T[], since: string, skipped: number[]): T[] {
  const skip = new Set(skipped);
  return active(orders)
    .filter(
      (o) =>
        o.payment !== "paid" &&
        !skip.has(o.id) &&
        (o.paymentRequestedAt === null || o.paymentRequestedAt < since),
    )
    .sort(byDayThenCreated);
}
