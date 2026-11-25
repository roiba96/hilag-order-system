// The Today screen's numbers and texts for one sale day. Pure. Cancelled orders never count.
import { formatPhone } from "./phone";
import type { FulfillmentType, OrderStatus, PaymentStatus } from "./types";

type TodayOrder = {
  id: number;
  day: string;
  fulfillment: FulfillmentType;
  status: OrderStatus;
  payment: PaymentStatus;
  customerName: string;
  customer: { phone: string };
  address: string | null;
  city: string | null;
  addressDetails: string | null;
  courierNotes: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  timeWindow: string | null;
  createdAt: string;
  boxes: { size: number }[];
  reminderSentAt?: string | null;
};

export type DaySummary = {
  booked: number;
  maxBoxes: number;
  left: number;
  /** Box size → count, biggest first. */
  boxesBySize: { size: number; count: number }[];
  pickups: number;
  deliveries: number;
  unpaid: number;
};

const active = <T extends TodayOrder>(orders: T[], day: string) =>
  orders
    .filter((o) => o.day === day && o.status !== "cancelled")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export function ordersFor<T extends TodayOrder>(orders: T[], day: string, fulfillment: FulfillmentType): T[] {
  return active(orders, day).filter((o) => o.fulfillment === fulfillment);
}

export function daySummary(orders: TodayOrder[], day: string, maxBoxes: number): DaySummary {
  const list = active(orders, day);
  const sizes = new Map<number, number>();
  for (const order of list) for (const box of order.boxes) sizes.set(box.size, (sizes.get(box.size) ?? 0) + 1);
  const booked = list.reduce((sum, o) => sum + o.boxes.length, 0);
  return {
    booked,
    maxBoxes,
    left: Math.max(0, maxBoxes - booked),
    boxesBySize: [...sizes].map(([size, count]) => ({ size, count })).sort((a, b) => b.size - a.size),
    pickups: list.filter((o) => o.fulfillment === "pickup").length,
    deliveries: list.filter((o) => o.fulfillment === "delivery").length,
    unpaid: list.filter((o) => o.payment !== "paid").length,
  };
}

/** "הדקל 5, קומה 3, נתניה". */
export function fullAddress(order: Pick<TodayOrder, "address" | "addressDetails" | "city">): string {
  return [order.address, order.addressDetails, order.city].filter(Boolean).join(", ");
}

/**
 * One line per delivery for the courier company's system:
 * name · phone · address, city · N מארזים · time window · notes.
 * A gift goes to its recipient, so the recipient's name and phone are used when given.
 */
export function courierText(orders: TodayOrder[]): string {
  return orders
    .map((order) => {
      const name = order.recipientName ?? order.customerName;
      const phone = order.recipientPhone ?? order.customer.phone;
      const boxes = order.boxes.length === 1 ? "מארז אחד" : `${order.boxes.length} מארזים`;
      return [name, formatPhone(phone), fullAddress(order), boxes, order.timeWindow, order.courierNotes]
        .filter(Boolean)
        .join(" · ");
    })
    .join("\n");
}

/** The first sale day after `today` ("YYYY-MM-DD"), or null. */
export function nextSaleDayAfter(days: string[], today: string): string | null {
  return [...days].sort().find((day) => day > today) ?? null;
}

/** Day-before reminder queue: active orders of `day` not reminded since `since`, minus skipped. */
export function dayReminderQueue<T extends TodayOrder>(orders: T[], day: string, since: string, skipped: number[]): T[] {
  const skip = new Set(skipped);
  return active(orders, day).filter(
    (o) => !skip.has(o.id) && (o.reminderSentAt == null || o.reminderSentAt < since),
  );
}
