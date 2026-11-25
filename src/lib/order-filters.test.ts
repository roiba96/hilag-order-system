import { describe, expect, it } from "vitest";
import { activeCountByDay, filterOrders, matchesQuery, phoneQueryDigits } from "./order-filters";

const order = (id: number, day: string, fullName: string, phone: string, status = "new" as const) => ({
  id,
  day,
  status,
  customerName: fullName,
  customer: { phone },
});

const orders = [
  order(1, "2026-12-06", "דנה כהן", "972521234567"),
  order(2, "2026-12-07", "Maya Levi", "972541112222"),
  { ...order(3, "2026-12-07", "רונית", "972509998877"), status: "cancelled" as const },
];

describe("phoneQueryDigits", () => {
  it("turns local formats into the stored prefix", () => {
    expect(phoneQueryDigits("052-1")).toBe("972521");
    expect(phoneQueryDigits("+972 52")).toBe("97252");
    expect(phoneQueryDigits("4567")).toBe("4567");
  });

  it("ignores queries with too few digits", () => {
    expect(phoneQueryDigits("דנה")).toBeNull();
    expect(phoneQueryDigits("05")).toBeNull();
  });
});

describe("matchesQuery", () => {
  it("matches part of the name, any case", () => {
    expect(matchesQuery(orders[0], "כהן")).toBe(true);
    expect(matchesQuery(orders[1], "maya")).toBe(true);
    expect(matchesQuery(orders[0], "לוי")).toBe(false);
  });

  it("matches the phone however it's typed", () => {
    expect(matchesQuery(orders[0], "0521")).toBe(true);
    expect(matchesQuery(orders[0], "052-123")).toBe(true);
    expect(matchesQuery(orders[0], "4567")).toBe(true);
    expect(matchesQuery(orders[1], "0521")).toBe(false);
  });

  it("matches everything when empty", () => {
    expect(matchesQuery(orders[0], "  ")).toBe(true);
  });
});

describe("filterOrders", () => {
  it("hides cancelled orders unless asked", () => {
    expect(filterOrders(orders, { day: "all", query: "", showCancelled: false }).map((o) => o.id)).toEqual([1, 2]);
    expect(filterOrders(orders, { day: "all", query: "", showCancelled: true }).map((o) => o.id)).toEqual([1, 2, 3]);
  });

  it("filters by day and search together", () => {
    expect(filterOrders(orders, { day: "2026-12-07", query: "", showCancelled: false }).map((o) => o.id)).toEqual([2]);
    expect(filterOrders(orders, { day: "2026-12-06", query: "maya", showCancelled: false })).toEqual([]);
  });
});

describe("activeCountByDay", () => {
  it("counts orders that aren't cancelled", () => {
    const counts = activeCountByDay(orders);
    expect(counts.get("2026-12-06")).toBe(1);
    expect(counts.get("2026-12-07")).toBe(1);
  });
});
