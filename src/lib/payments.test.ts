import { describe, expect, it } from "vitest";
import { paidOrders, paymentTotals, reminderQueue, unpaidOrders } from "./payments";

const order = (
  id: number,
  day: string,
  payment: "unpaid" | "requested" | "paid",
  total: number,
  extra: { status?: "new" | "confirmed" | "cancelled"; confirmationSentAt?: string | null; paymentRequestedAt?: string | null; createdAt?: string } = {},
) => ({
  id,
  day,
  payment,
  total,
  status: extra.status ?? "new",
  confirmationSentAt: extra.confirmationSentAt ?? null,
  paymentRequestedAt: extra.paymentRequestedAt ?? null,
  createdAt: extra.createdAt ?? `2026-11-2${id % 10}T10:00:00Z`,
});

const orders = [
  order(1, "2026-12-07", "paid", 122, { status: "confirmed", paymentRequestedAt: "2026-11-20T10:00:00Z" }),
  order(2, "2026-12-06", "requested", 246, { paymentRequestedAt: "2026-11-23T10:00:00Z" }),
  order(3, "2026-12-06", "unpaid", 84),
  order(4, "2026-12-07", "unpaid", 100, { status: "cancelled" }),
  order(5, "2026-12-04", "requested", 162, { paymentRequestedAt: "2026-11-25T09:00:00Z" }),
];

describe("paymentTotals", () => {
  it("sums expected, collected and unpaid, ignoring cancelled orders", () => {
    expect(paymentTotals(orders)).toEqual({
      expected: 122 + 246 + 84 + 162,
      collected: 122,
      paidCount: 1,
      unpaidCount: 3,
      unpaidSum: 246 + 84 + 162,
    });
  });

  it("is all zeros with no orders", () => {
    expect(paymentTotals([])).toEqual({ expected: 0, collected: 0, paidCount: 0, unpaidCount: 0, unpaidSum: 0 });
  });
});

describe("unpaidOrders", () => {
  it("puts already-requested orders first, each group by day", () => {
    expect(unpaidOrders(orders, true).map((o) => o.id)).toEqual([5, 2, 3]);
  });

  it("or last", () => {
    expect(unpaidOrders(orders, false).map((o) => o.id)).toEqual([3, 5, 2]);
  });
});

describe("unpaidOrders: summary sent but payment still 'unpaid'", () => {
  it("sorts with the orders awaiting payment, like its badge says", () => {
    const list = [
      order(1, "2026-12-04", "unpaid", 100),
      order(2, "2026-12-07", "unpaid", 100, { confirmationSentAt: "2026-11-24T10:00:00Z" }),
    ];
    expect(unpaidOrders(list, true).map((o) => o.id)).toEqual([2, 1]);
    expect(unpaidOrders(list, false).map((o) => o.id)).toEqual([1, 2]);
  });
});

describe("paidOrders", () => {
  it("lists paid, not-cancelled orders", () => {
    expect(paidOrders(orders).map((o) => o.id)).toEqual([1]);
  });
});

describe("reminderQueue", () => {
  const since = "2026-11-24T12:00:00Z";

  it("holds not-paid orders not reminded since the queue started, by day", () => {
    // 5 was reminded after `since`, so it's already done; 1 is paid; 4 is cancelled.
    expect(reminderQueue(orders, since, []).map((o) => o.id)).toEqual([2, 3]);
  });

  it("drops skipped orders", () => {
    expect(reminderQueue(orders, since, [2]).map((o) => o.id)).toEqual([3]);
  });

  it("includes everything not paid when the queue started before any request", () => {
    expect(reminderQueue(orders, "2026-12-31T00:00:00Z", []).map((o) => o.id)).toEqual([5, 2, 3]);
  });
});
