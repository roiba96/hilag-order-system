// What the New order form sends, and the rules the server applies before saving. Pure.
import { z } from "zod";
import { normalizePhone, phoneError } from "./phone";
import {
  type BoxSize,
  type FulfillmentType,
  type OrderSource,
  BOX_SIZES,
  FULFILLMENT_TYPES,
  ORDER_SOURCES,
} from "./types";

/** "מארז 2: נבחרו 3 מתוך 4", or null when the box is exactly full. */
export function boxFullError(index: number, donuts: number, size: number): string | null {
  return donuts === size ? null : `מארז ${index + 1}: נבחרו ${donuts} מתוך ${size}`;
}

const countItems = (items: { qty: number }[]) => items.reduce((sum, item) => sum + item.qty, 0);

export const OrderInputSchema = z.object({
  /** Set when editing an existing order. */
  orderId: z.number().int().positive().optional(),
  fullName: z.string().max(100),
  phone: z.string().max(40),
  day: z.string().max(10),
  fulfillment: z.enum(FULFILLMENT_TYPES),
  /** Delivery: street + house number. */
  address: z.string().max(200),
  city: z.string().max(100),
  /** Delivery, optional: floor / apartment / entrance. */
  addressDetails: z.string().max(200),
  /** Delivery, optional: for the courier, e.g. a building code. */
  courierNotes: z.string().max(500),
  /** Delivery, optional: when the recipient isn't the customer (a gift). */
  recipientName: z.string().max(100),
  recipientPhone: z.string().max(40),
  timeWindow: z.string().max(100),
  notes: z.string().max(2000),
  source: z.enum(ORDER_SOURCES),
  rawMessage: z.string().max(10000),
  boxes: z
    .array(
      z.object({
        /** Editing: the saved box this card started from (kept as is if unchanged). */
        boxId: z.number().int().positive().optional(),
        size: z.literal(BOX_SIZES),
        items: z.array(
          z.object({
            flavorId: z.number().int().positive(),
            qty: z.number().int().min(0).max(6),
          }),
        ),
      }),
    )
    .max(40)
    // Boxes must be exactly full: the schema, validateOrder and save_order (007) all insist.
    .superRefine((boxes, ctx) =>
      boxes.forEach((box, index) => {
        const message = boxFullError(index, countItems(box.items), box.size);
        if (message) ctx.addIssue({ code: "custom", path: [index], message });
      }),
    ),
  /** Set after the baker confirms the closed-day / over-capacity dialog. */
  confirmClosed: z.boolean(),
  confirmOver: z.boolean(),
});

export type OrderInput = z.infer<typeof OrderInputSchema>;

export type OrderField =
  | "fullName"
  | "phone"
  | "day"
  | "fulfillment"
  | "address"
  | "city"
  | "recipientPhone"
  | "boxes";
export type FieldErrors = Partial<Record<OrderField, string>>;

export type CleanBox = {
  boxId?: number;
  size: BoxSize;
  items: { flavorId: number; qty: number }[];
};

export type CleanOrder = {
  fullName: string;
  phone: string; // normalized
  day: string;
  fulfillment: FulfillmentType;
  address: string | null;
  city: string | null;
  addressDetails: string | null;
  courierNotes: string | null;
  recipientName: string | null;
  /** Normalized, or null. */
  recipientPhone: string | null;
  timeWindow: string | null;
  notes: string | null;
  source: OrderSource;
  rawMessage: string | null;
  boxes: CleanBox[];
};

export const ORDER_ERRORS = {
  fullName: "צריך למלא שם.",
  day: "צריך לבחור יום.",
  address: "למשלוח צריך רחוב ומספר בית.",
  houseNumber: "חסר מספר בית",
  city: "למשלוח צריך עיר.",
  recipientPhone: "הטלפון של מקבל המשלוח לא תקין. למשל: 052-123-4567",
  noBoxes: "צריך להוסיף לפחות מארז אחד.",
} as const;

/** "הדקל 5", "5 הדקל", "רחוב הרצל 12א" have one; "הדקל" doesn't. */
export function hasHouseNumber(street: string): boolean {
  return /\d/.test(street);
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Merge repeated flavors and drop zero quantities. */
export function cleanBox(box: OrderInput["boxes"][number]): CleanBox {
  const qtyByFlavor = new Map<number, number>();
  for (const { flavorId, qty } of box.items) {
    if (qty > 0) qtyByFlavor.set(flavorId, (qtyByFlavor.get(flavorId) ?? 0) + qty);
  }
  return {
    ...(box.boxId ? { boxId: box.boxId } : {}),
    size: box.size,
    items: [...qtyByFlavor].map(([flavorId, qty]) => ({ flavorId, qty })),
  };
}

/** Same size and the same quantity of every flavor (order doesn't matter). */
export function sameBoxContents(a: CleanBox, b: CleanBox): boolean {
  if (a.size !== b.size || a.items.length !== b.items.length) return false;
  const qty = new Map(a.items.map((item) => [item.flavorId, item.qty]));
  return b.items.every((item) => qty.get(item.flavorId) === item.qty);
}

/**
 * Blocking problems only: missing details, or a box that isn't exactly full.
 */
export function validateOrder(
  input: OrderInput,
): { ok: true; order: CleanOrder } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const delivery = input.fulfillment === "delivery";

  if (!input.fullName.trim()) errors.fullName = ORDER_ERRORS.fullName;
  const phoneProblem = phoneError(input.phone);
  if (phoneProblem) errors.phone = phoneProblem;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) errors.day = ORDER_ERRORS.day;
  if (delivery) {
    const street = input.address.trim();
    if (!street) errors.address = ORDER_ERRORS.address;
    else if (!hasHouseNumber(street)) errors.address = ORDER_ERRORS.houseNumber;
    if (!input.city.trim()) errors.city = ORDER_ERRORS.city;
    if (input.recipientPhone.trim() && !normalizePhone(input.recipientPhone)) {
      errors.recipientPhone = ORDER_ERRORS.recipientPhone;
    }
  }

  const boxes = input.boxes.map(cleanBox);
  if (boxes.length === 0) {
    errors.boxes = ORDER_ERRORS.noBoxes;
  } else {
    const problem = boxes
      .map((box, index) => boxFullError(index, countItems(box.items), box.size))
      .find((message) => message !== null);
    if (problem) errors.boxes = problem;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    order: {
      fullName: input.fullName.trim(),
      phone: normalizePhone(input.phone) as string,
      day: input.day,
      fulfillment: input.fulfillment,
      // Pickup orders keep no delivery details, even if something was typed earlier.
      address: delivery ? blankToNull(input.address) : null,
      city: delivery ? blankToNull(input.city) : null,
      addressDetails: delivery ? blankToNull(input.addressDetails) : null,
      courierNotes: delivery ? blankToNull(input.courierNotes) : null,
      recipientName: delivery ? blankToNull(input.recipientName) : null,
      recipientPhone:
        delivery && input.recipientPhone.trim() ? normalizePhone(input.recipientPhone) : null,
      timeWindow: delivery ? blankToNull(input.timeWindow) : null,
      notes: blankToNull(input.notes),
      source: input.source,
      rawMessage: blankToNull(input.rawMessage),
      boxes,
    },
  };
}

export type DayRules = {
  label: string;
  allowsPickup: boolean;
  allowsDelivery: boolean;
  isOpen: boolean;
  maxBoxes: number;
};

/**
 * The day's hard rules (same as the DB trigger), as a Hebrew message, or null.
 * The label leads with a colon, never a prefix: "בלפני החג" doesn't read, "לפני החג: ..." does.
 */
export function dayRuleError(day: DayRules, fulfillment: FulfillmentType): string | null {
  if (!day.allowsPickup && !day.allowsDelivery) return `${day.label}: אין הזמנות ביום הזה.`;
  if (fulfillment === "delivery" && !day.allowsDelivery) return `${day.label}: יש רק איסוף עצמי.`;
  if (fulfillment === "pickup" && !day.allowsPickup) return `${day.label}: אין איסוף עצמי.`;
  return null;
}

/**
 * Days New order offers. There's no order deadline: a day takes orders until it fills up or
 * The baker closes it. A day that's over in Israel time (day < today) is history and isn't offered;
 * today itself is. A day with neither pickup nor delivery takes no orders at all.
 * `keepDay` (editing) keeps that order's own day in the list even if it has passed.
 */
export function bookableDays<T extends { day: string; allowsPickup: boolean; allowsDelivery: boolean }>(
  days: T[],
  today: string,
  keepDay?: string,
): T[] {
  return days.filter(
    (d) => d.day === keepDay || (d.day >= today && (d.allowsPickup || d.allowsDelivery)),
  );
}

/**
 * The server's check: no new order on a day that's over. Editing may keep an old order on its
 * own (past) day, but can't move it to another past day.
 */
export function pastDayError(day: string, today: string, existingDay?: string): string | null {
  if (day >= today || day === existingDay) return null;
  return "היום הזה כבר עבר. צריך לבחור יום אחר.";
}

export type ConfirmNeeded = { kind: "closed" | "over"; message: string };

/**
 * Soft limits: a closed day or going over max_boxes needs the baker's confirmation, never a block.
 * `booked` = boxes already on the day (not cancelled), `adding` = boxes in this order.
 */
export function capacityConfirm(
  day: DayRules,
  booked: number,
  adding: number,
  confirmed: { closed: boolean; over: boolean },
): ConfirmNeeded | null {
  if (!day.isOpen && !confirmed.closed) {
    return {
      kind: "closed",
      message: `${day.label} סגור להזמנות חדשות. לשמור בכל זאת הזמנה ליום הזה?`,
    };
  }
  const overBy = booked + adding - day.maxBoxes;
  if (overBy > 0 && !confirmed.over) {
    const amount = overBy === 1 ? "במארז אחד" : `ב-${overBy} מארזים`;
    return { kind: "over", message: `${day.label} יעבור את התקרה ${amount}. לשמור בכל זאת?` };
  }
  return null;
}
