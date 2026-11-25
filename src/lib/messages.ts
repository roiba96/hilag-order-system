// WhatsApp message texts, as pure functions of the order. Edit the wording here.
// Emoji belong only in these texts, never in the app's UI.
import { BUSINESS, PICKUP_WINDOW } from "./config";
import { dayText } from "./dates";
import { formatShekels } from "./money";
import {
  type PricedBox,
  DELIVERY_FEE,
  boxFlavorsText,
  boxesSummary,
  describeBox,
  orderTotal,
} from "./pricing";
import type { FulfillmentType } from "./types";

/** Optional lines the developer may want to drop later: flip to false. */
export const MESSAGE_OPTIONS = {
  /** "(40 ₪)" after the delivery address. */
  showDeliveryFee: true,
  /** "המשלוחים יוצאים ב-11:00" under the delivery line / the pickup window on the pickup line. */
  showTimingLine: true,
};

export type SummaryMessageInput = {
  /** sale_days.label, e.g. "נר רביעי". */
  candle: string;
  /** "YYYY-MM-DD". */
  day: string;
  fulfillment: FulfillmentType;
  address: string | null;
  city: string | null;
  boxes: PricedBox[];
  /** Number of flavors on the menu, to recognize "אחד מכל טעם". */
  menuFlavorCount: number;
  /** NEXT_PUBLIC_PAYBOX_LINK; empty → the link line is left out. */
  payboxLink: string | null | undefined;
};

/**
 * The baker's order summary + payment request: ONE message, sent right after saving.
 * Sending it marks confirmation_sent_at, payment_requested_at and payment = 'requested'.
 */
export function orderSummaryMessage(
  order: SummaryMessageInput,
  options: typeof MESSAGE_OPTIONS = MESSAGE_OPTIONS,
): string {
  const delivery = order.fulfillment === "delivery";
  const total = orderTotal(order.boxes, order.fulfillment);
  const link = order.payboxLink?.trim();

  // One box: flavors on the same line. Several: one line per box under the heading.
  const flavorsLines =
    order.boxes.length === 1
      ? [`🎁 טעמים: ${boxFlavorsText(order.boxes[0], order.menuFlavorCount)}`]
      : ["🎁 טעמים:", ...order.boxes.map((box) => describeBox(box, order.menuFlavorCount))];

  const place = [order.address, order.city].filter(Boolean).join(", ");
  const fulfillmentLine = delivery
    ? `📍 משלוח ל${place}${options.showDeliveryFee ? ` (${formatShekels(DELIVERY_FEE)})` : ""}`
    : `📍 איסוף עצמי ב${BUSINESS.pickupPlace}${options.showTimingLine ? `, ${PICKUP_WINDOW}` : ""}`;

  const lines = [
    "היייי! 🥰",
    `איזה כיף שהזמנתם סופגניות לחנוכה מ-${BUSINESS.name}!`,
    "",
    "רק עושה סדר בפרטי ההזמנה שלכם:",
    "",
    `📅 תאריך ההזמנה: ${order.candle}, ${dayText(order.day)}`,
    `🍩 מארז: ${boxesSummary(order.boxes)}`,
    ...flavorsLines,
    fulfillmentLine,
    ...(delivery && options.showTimingLine ? [`המשלוחים יוצאים ב-${BUSINESS.batchTimes.delivery}`] : []),
    `💰 סה״כ לתשלום: ${formatShekels(total)}`,
    "",
    ...(link
      ? [
          "כדי להשלים ולשריין את ההזמנה, ניתן להעביר את התשלום מראש דרך PayBox בקישור המצורף:",
          "",
          link,
        ]
      : ["כדי להשלים ולשריין את ההזמנה, ניתן להעביר את התשלום מראש דרך PayBox."]),
    "",
    "לאחר ביצוע התשלום ההזמנה שלכם סגורה ומאושרת ❤️",
    "",
    "מחכה לפנק אתכם בחנוכה מתוק וטעים!",
    "חג שמח 🕎",
  ];
  return lines.join("\n");
}

export type ReminderMessageInput = {
  fullName: string;
  /** sale_days.label, e.g. "נר רביעי". */
  candle: string;
  /** "YYYY-MM-DD". */
  day: string;
  /** Whole shekels, the saved order total. */
  total: number;
  payboxLink: string | null | undefined;
};

/** "דנה כהן" → "דנה". */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** "היייי דנה! 🥰" */
function greeting(fullName: string): string {
  const name = firstName(fullName);
  return `היייי${name ? ` ${name}` : ""}! 🥰`;
}

/**
 * The baker's payment reminder for orders that aren't paid yet (Payments screen). Goes to the
 * customer who ordered, also for a gift. Sending it marks payment_requested_at and
 * payment = 'requested'. With a PayBox link set, the link follows the PayBox line.
 */
export function paymentReminderMessage(order: ReminderMessageInput): string {
  const link = order.payboxLink?.trim();
  return [
    greeting(order.fullName),
    `רק תזכורת קטנה לגבי הסופגניות מ-${BUSINESS.name} 🍩`,
    "",
    `📅 תאריך ההזמנה: ${order.candle}, ${dayText(order.day)}`,
    `💰 סה״כ לתשלום: ${formatShekels(order.total)}`,
    "",
    "כדי לשריין את ההזמנה, אפשר להעביר את התשלום דרך PayBox 🙏",
    ...(link ? [link] : []),
    "אחרי התשלום ההזמנה סגורה ומאושרת ❤️",
    "",
    "תודה וחג שמח! 🕎",
  ].join("\n");
}

export type DayReminderInput = {
  fullName: string;
  candle: string;
  /** "YYYY-MM-DD". */
  day: string;
  /** True when the order is for tomorrow (Asia/Jerusalem); otherwise "מחר זה קורה" is left out. */
  isTomorrow: boolean;
  fulfillment: FulfillmentType;
  /** Street, details and city in one line. */
  address: string;
  /** Whole shekels, the saved order total. */
  total: number;
  paid: boolean;
};

/**
 * The baker's day-before reminder (Today screen and its queue). Goes to the customer who ordered,
 * also for a gift: it can ask for payment, which a gift's recipient must never see.
 * Sending it marks reminder_sent_at.
 */
export function dayReminderMessage(order: DayReminderInput): string {
  const delivery = order.fulfillment === "delivery";
  return [
    greeting(order.fullName),
    ...(order.isTomorrow ? ["מחר זה קורה! 🍩"] : []),
    "",
    `📅 ${order.candle}, ${dayText(order.day)}`,
    delivery
      ? `🚚 המשלוח יוצא מ-${BUSINESS.batchTimes.delivery} לכתובת: ${order.address}`
      : `📍 איסוף עצמי ב${BUSINESS.pickupPlace}, ${PICKUP_WINDOW}`,
    ...(order.paid ? [] : [`💰 נשאר לתשלום ${formatShekels(order.total)} דרך PayBox`]),
    "",
    delivery ? "שיהיה בתיאבון! חג שמח 🕎" : "מחכה לראות אותך! חג שמח 🕎",
  ].join("\n");
}
