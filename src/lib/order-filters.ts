// Filters for the Orders list: day chips, search by name or phone, cancelled toggle. Pure.
import type { OrderStatus } from "./types";

type FilterableOrder = {
  day: string;
  status: OrderStatus;
  /** The name saved with the order (not the customer's latest name). */
  customerName: string;
  customer: { phone: string };
};

export type OrderFilter = {
  /** "all" or a sale day "YYYY-MM-DD". */
  day: string;
  query: string;
  showCancelled: boolean;
};

/**
 * Phone digits to look for in a stored "9725XXXXXXXX", or null when the query isn't a
 * phone search (fewer than 3 digits). A leading 0 becomes 972: "052-1" → "972521".
 */
export function phoneQueryDigits(query: string): string | null {
  let digits = query.replace(/\D/g, "");
  if (digits.length < 3) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  return digits;
}

export function matchesQuery(order: FilterableOrder, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (order.customerName.toLowerCase().includes(q)) return true;
  const digits = phoneQueryDigits(q);
  return digits !== null && order.customer.phone.includes(digits);
}

export function filterOrders<T extends FilterableOrder>(orders: T[], filter: OrderFilter): T[] {
  return orders.filter(
    (order) =>
      (filter.showCancelled || order.status !== "cancelled") &&
      (filter.day === "all" || order.day === filter.day) &&
      matchesQuery(order, filter.query),
  );
}

/** Active (not cancelled) orders per day, for the chip counts. */
export function activeCountByDay(orders: FilterableOrder[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "cancelled") counts.set(order.day, (counts.get(order.day) ?? 0) + 1);
  }
  return counts;
}
