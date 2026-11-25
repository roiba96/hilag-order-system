// CSV export of all orders for Excel. Pure.
// UTF-8 with a BOM and CRLF line endings: that's what makes Excel show Hebrew correctly.
import { BUSINESS } from "./config";
import { shortDate } from "./dates";
import type { SavedOrder } from "./order-data";
import { paymentLabel } from "./payment-state";
import { formatPhone } from "./phone";
import { describeBox } from "./pricing";
import { fullAddress } from "./today";
import type { OrderStatus } from "./types";

const BOM = "﻿";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "חדשה",
  confirmed: "מאושרת",
  ready: "מוכנה",
  completed: "הושלמה",
  cancelled: "בוטלה",
};

const HEADERS = [
  "מספר הזמנה",
  "שם",
  "טלפון",
  "יום",
  "תאריך",
  "איסוף / משלוח",
  "כתובת מלאה",
  "מארזים",
  'סה"כ (₪)',
  "תשלום",
  "סטטוס",
];

/**
 * One CSV field. Quoted when it holds a comma, quote or line break (quotes doubled).
 * Text that starts like a formula (= + - @) gets a leading apostrophe, so Excel shows it
 * instead of running it. Numbers are written as plain numbers.
 */
export function csvField(value: string | number): string {
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function ordersCsv(orders: SavedOrder[], dayLabels: Record<string, string>, menuFlavorCount: number): string {
  const rows = orders.map((order) => [
    order.id,
    order.customerName,
    formatPhone(order.customer.phone),
    dayLabels[order.day] ?? "",
    shortDate(order.day),
    order.fulfillment === "delivery" ? "משלוח" : "איסוף עצמי",
    order.fulfillment === "delivery" ? fullAddress(order) : `איסוף ב${BUSINESS.pickupPlace}`,
    order.boxes.map((box) => describeBox({ size: box.size, items: box.items }, menuFlavorCount)).join(" | "),
    order.total,
    paymentLabel(order),
    STATUS_LABELS[order.status],
  ]);
  return BOM + [HEADERS, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/** "HILAG-orders-2026-12-01.csv" */
export function csvFileName(today: string): string {
  return `${BUSINESS.name}-orders-${today}.csv`;
}
