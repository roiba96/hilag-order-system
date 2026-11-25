// Pure helpers for the order form: draft boxes → priced boxes, and the live warnings list.
import type { FormDay, MenuFlavor, SavedOrder } from "./order-data";
import { boxFullError, hasHouseNumber } from "./order-input";
import { formatPhone, phoneError } from "./phone";
import { type PricedBox, boxDonuts } from "./pricing";
import type { BoxSize, FulfillmentType, OrderSource } from "./types";

/** A box while it's being edited: quantity per flavor id. boxId = the saved box it came from. */
export type DraftBox = { key: string; boxId?: number; size: BoxSize; qty: Record<number, number> };

/** Everything the form edits, as text the inputs show. */
export type OrderFormValues = {
  fullName: string;
  phone: string;
  day: string;
  fulfillment: FulfillmentType;
  address: string;
  city: string;
  addressDetails: string;
  courierNotes: string;
  recipientName: string;
  recipientPhone: string;
  timeWindow: string;
  notes: string;
  source: OrderSource;
  boxes: DraftBox[];
};

export function emptyValues(): OrderFormValues {
  return {
    fullName: "",
    phone: "",
    day: "",
    fulfillment: "pickup",
    address: "",
    city: "",
    addressDetails: "",
    courierNotes: "",
    recipientName: "",
    recipientPhone: "",
    timeWindow: "",
    notes: "",
    source: "whatsapp",
    boxes: [emptyBox("box-0")],
  };
}

/** A saved order as form values, for editing. */
export function savedOrderValues(order: SavedOrder): OrderFormValues {
  return {
    fullName: order.customerName,
    phone: formatPhone(order.customer.phone),
    day: order.day,
    fulfillment: order.fulfillment,
    address: order.address ?? "",
    city: order.city ?? "",
    addressDetails: order.addressDetails ?? "",
    courierNotes: order.courierNotes ?? "",
    recipientName: order.recipientName ?? "",
    recipientPhone: order.recipientPhone ? formatPhone(order.recipientPhone) : "",
    timeWindow: order.timeWindow ?? "",
    notes: order.notes ?? "",
    source: order.source,
    boxes: order.boxes.map((box) => ({
      key: `saved-${box.id}`,
      boxId: box.id,
      size: box.size,
      qty: Object.fromEntries(box.items.map((item) => [item.flavorId, item.qty])),
    })),
  };
}

export function emptyBox(key: string, size: BoxSize = 6): DraftBox {
  return { key, size, qty: {} };
}

/** One of each active flavor (the 6-box shortcut). */
export function oneOfEachQty(menu: MenuFlavor[]): Record<number, number> {
  return Object.fromEntries(menu.filter((f) => f.isActive).map((f) => [f.id, 1]));
}

export function draftToPriced(box: DraftBox, menu: MenuFlavor[]): PricedBox {
  return {
    size: box.size,
    items: menu
      .filter((f) => (box.qty[f.id] ?? 0) > 0)
      .map((f) => ({ flavorId: f.id, name: f.name, qty: box.qty[f.id], unitPrice: f.price })),
  };
}

export type WarningInput = {
  fullName: string;
  phone: string;
  fulfillment: FulfillmentType;
  address: string;
  city: string;
  day: FormDay | undefined;
  boxes: PricedBox[];
};

/** The boxes that aren't exactly full, "מארז 2: נבחרו 3 מתוך 4". Any of them blocks saving. */
export function boxProblems(boxes: PricedBox[]): string[] {
  return boxes
    .map((box, index) => boxFullError(index, boxDonuts(box), box.size))
    .filter((message): message is string => message !== null);
}

/** Everything worth a second look before saving. Box problems block; the rest the server decides. */
export function formWarnings(input: WarningInput): string[] {
  const warnings: string[] = [];
  if (!input.fullName.trim()) warnings.push("חסר שם");
  if (!input.phone.trim()) warnings.push("חסר טלפון");
  else if (phoneError(input.phone)) warnings.push("הטלפון לא תקין");
  if (!input.day) warnings.push("עוד לא נבחר יום");
  if (input.fulfillment === "delivery") {
    if (!input.address.trim()) warnings.push("חסרה כתובת למשלוח");
    else if (!hasHouseNumber(input.address)) warnings.push("חסר מספר בית");
    if (!input.city.trim()) warnings.push("חסרה עיר למשלוח");
  }
  if (input.boxes.length === 0) warnings.push("אין מארזים בהזמנה");
  warnings.push(...boxProblems(input.boxes));
  if (input.day) {
    if (!input.day.isOpen) warnings.push(`${input.day.label} סגור להזמנות חדשות`);
    const overBy = input.day.booked + input.boxes.length - input.day.maxBoxes;
    if (overBy > 0) {
      warnings.push(
        `${input.day.label} יעבור את התקרה ${overBy === 1 ? "במארז אחד" : `ב-${overBy} מארזים`}`,
      );
    }
  }
  return warnings;
}
