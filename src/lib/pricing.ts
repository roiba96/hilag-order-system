// Box and order math. Pure: the server uses it with DB snapshot prices, the form for display.
// Box price = sum of its items' prices. Delivery fee per order from the config. Whole shekels.
import { BUSINESS } from "./config";
import type { BoxSize, FulfillmentType } from "./types";

export const DELIVERY_FEE = BUSINESS.deliveryFee;

export type PricedItem = {
  flavorId: number;
  name: string;
  qty: number;
  /** Whole shekels per donut (the snapshot for saved boxes). */
  unitPrice: number;
};

export type PricedBox = {
  size: BoxSize;
  /** In menu order (flavors.sort_order). */
  items: PricedItem[];
};

export function boxDonuts(box: PricedBox): number {
  return box.items.reduce((sum, item) => sum + item.qty, 0);
}

export function boxPrice(box: PricedBox): number {
  return box.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
}

export function boxIsFull(box: PricedBox): boolean {
  return boxDonuts(box) === box.size;
}

export function deliveryFee(fulfillment: FulfillmentType): number {
  return fulfillment === "delivery" ? DELIVERY_FEE : 0;
}

export function itemsTotal(boxes: PricedBox[]): number {
  return boxes.reduce((sum, box) => sum + boxPrice(box), 0);
}

export function orderTotal(boxes: PricedBox[], fulfillment: FulfillmentType): number {
  return itemsTotal(boxes) + deliveryFee(fulfillment);
}

export function orderDonuts(boxes: PricedBox[]): number {
  return boxes.reduce((sum, box) => sum + boxDonuts(box), 0);
}

/** One of every flavor on the menu, one each, filling the box exactly. */
export function isOneOfEach(box: PricedBox, menuFlavorCount: number): boolean {
  const items = box.items.filter((item) => item.qty > 0);
  return (
    menuFlavorCount > 0 &&
    items.length === menuFlavorCount &&
    items.every((item) => item.qty === 1) &&
    boxDonuts(box) === box.size
  );
}

/** "אחד מכל טעם" / "שוקולד ×2, קינדר ×2" / "עוד לא נבחרו טעמים". */
export function boxFlavorsText(box: PricedBox, menuFlavorCount: number): string {
  const items = box.items.filter((item) => item.qty > 0);
  if (items.length === 0) return "עוד לא נבחרו טעמים";
  if (isOneOfEach(box, menuFlavorCount)) return "אחד מכל טעם";
  return items.map((item) => `${item.name} ×${item.qty}`).join(", ");
}

/** "מארז 6 · אחד מכל טעם" / "מארז 4 · שוקולד ×2, קינדר ×2". */
export function describeBox(box: PricedBox, menuFlavorCount: number): string {
  return `מארז ${box.size} · ${boxFlavorsText(box, menuFlavorCount)}`;
}

/** "מארז 6" for one box, "2 מארזים (6 + 4)" for several. */
export function boxesSummary(boxes: PricedBox[]): string {
  if (boxes.length === 1) return `מארז ${boxes[0].size}`;
  return `${boxes.length} מארזים (${boxes.map((box) => box.size).join(" + ")})`;
}
