// The WhatsApp link of each order, built on the server while the page renders, so a WhatsApp
// button is a plain <a href> and the tap itself is the navigation: links are more reliable and
// don't depend on timing. Pure. null = the saved phone isn't a usable mobile number, so no link.
import { isTomorrow } from "./dates";
import { dayReminderMessage, orderSummaryMessage, paymentReminderMessage } from "./messages";
import { type SavedOrder, savedBoxPriced } from "./order-data";
import { normalizePhone } from "./phone";
import { fullAddress } from "./today";
import { waLink } from "./whatsapp";

/** order id → link */
export type OrderLinks = Record<number, string | null>;

type Labels = Record<string, string>;

/**
 * Every message goes to the customer who ordered, also when a gift has its own recipient: the
 * texts can ask for payment. One bad phone must not break the whole page, so it gives null.
 */
function linkTo(order: SavedOrder, text: string): string | null {
  const phone = normalizePhone(order.customer.phone);
  return phone ? waLink(phone, text) : null;
}

export function summaryLink(
  order: SavedOrder,
  labels: Labels,
  menuFlavorCount: number,
  payboxLink: string | undefined,
): string | null {
  return linkTo(
    order,
    orderSummaryMessage({
      candle: labels[order.day] ?? "",
      day: order.day,
      fulfillment: order.fulfillment,
      address: order.address,
      city: order.city,
      boxes: order.boxes.map(savedBoxPriced),
      menuFlavorCount,
      payboxLink,
    }),
  );
}

export function paymentReminderLink(
  order: SavedOrder,
  labels: Labels,
  payboxLink: string | undefined,
): string | null {
  return linkTo(
    order,
    paymentReminderMessage({
      fullName: order.customerName,
      candle: labels[order.day] ?? "",
      day: order.day,
      total: order.total,
      payboxLink,
    }),
  );
}

export function dayReminderLink(order: SavedOrder, labels: Labels, today: string): string | null {
  return linkTo(
    order,
    dayReminderMessage({
      fullName: order.customerName,
      candle: labels[order.day] ?? "",
      day: order.day,
      isTomorrow: isTomorrow(today, order.day),
      fulfillment: order.fulfillment,
      address: fullAddress(order),
      total: order.total,
      paid: order.payment === "paid",
    }),
  );
}

/** Links for the orders that need one, by order id. */
export function linksFor(orders: SavedOrder[], link: (order: SavedOrder) => string | null): OrderLinks {
  return Object.fromEntries(orders.map((order) => [order.id, link(order)]));
}
