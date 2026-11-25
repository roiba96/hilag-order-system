"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { todayInJerusalem } from "@/lib/dates";
import { orderSummaryMessage } from "@/lib/messages";
import { toShekels } from "@/lib/money";
import { loadDays, loadMenu, loadOrder, savedBoxPriced } from "@/lib/order-data";
import {
  type CleanBox,
  type FieldErrors,
  OrderInputSchema,
  capacityConfirm,
  dayRuleError,
  pastDayError,
  sameBoxContents,
  validateOrder,
} from "@/lib/order-input";
import { type PricedBox, deliveryFee } from "@/lib/pricing";
import { waLink } from "@/lib/whatsapp";

export type SaveResult =
  | { status: "invalid"; errors: FieldErrors }
  | { status: "confirm"; kind: "closed" | "over"; message: string }
  | { status: "error"; message: string }
  | {
      status: "saved";
      orderId: number;
      edited: boolean;
      total: number;
      customerName: string;
      /** The phone was already known; holds the name it had before (the new name wins). */
      returningCustomer: { previousName: string } | null;
      /** The summary's WhatsApp link for the saved panel. Recorded as sent only when tapped. */
      waUrl: string | null;
    };

const SAVE_FAILED = "השמירה נכשלה. כדאי לנסות שוב.";

const SaveOrderReply = z.object({
  order_id: z.number(),
  customer_id: z.number(),
  previous_name: z.string().nullable(),
  grand_total: z.union([z.number(), z.string()]),
});

/**
 * Saves a new order or an edit. The app validates, checks the day's rules and capacity
 * (asking the baker to confirm when needed), then save_order (migration 004) writes customer,
 * order, boxes and price snapshots in one transaction. On edit, unchanged boxes keep their
 * snapshot; changed or new boxes get today's prices.
 */
export async function saveOrder(raw: unknown): Promise<SaveResult> {
  const { supabase } = await requireUser();

  const parsed = OrderInputSchema.safeParse(raw);
  if (!parsed.success) {
    const unfilled = parsed.error.issues.find((issue) => issue.path[0] === "boxes" && issue.code === "custom");
    if (unfilled) return { status: "invalid", errors: { boxes: unfilled.message } };
    return { status: "error", message: SAVE_FAILED };
  }
  const input = parsed.data;

  const validated = validateOrder(input);
  if (!validated.ok) return { status: "invalid", errors: validated.errors };
  const order = validated.order;

  let menu, days, existing;
  try {
    [menu, days, existing] = await Promise.all([
      loadMenu(supabase),
      loadDays(supabase),
      input.orderId ? loadOrder(supabase, input.orderId) : Promise.resolve(null),
    ]);
  } catch (error) {
    console.error("saveOrder: load", (error as Error).message);
    return { status: "error", message: SAVE_FAILED };
  }
  if (input.orderId && !existing) return { status: "error", message: "ההזמנה לא נמצאה." };
  if (existing?.status === "cancelled") {
    return { status: "error", message: "ההזמנה בוטלה, אי אפשר לערוך אותה." };
  }

  const day = days.find((d) => d.day === order.day);
  if (!day) return { status: "invalid", errors: { day: "היום שנבחר לא קיים." } };
  // No deadline, but no new orders on a day that's over (Israel time). An edit may keep its own day.
  const pastError = pastDayError(order.day, todayInJerusalem(new Date()), existing?.day);
  if (pastError) return { status: "invalid", errors: { day: pastError } };
  const ruleError = dayRuleError(day, order.fulfillment);
  if (ruleError) return { status: "invalid", errors: { fulfillment: ruleError } };

  // When editing on the same day, this order's own boxes are already in "booked".
  const ownBoxes = existing && existing.day === order.day ? existing.boxes.length : 0;
  const confirm = capacityConfirm(day, day.booked - ownBoxes, order.boxes.length, {
    closed: input.confirmClosed,
    over: input.confirmOver,
  });
  if (confirm) return { status: "confirm", ...confirm };

  // Split boxes: unchanged saved boxes are kept (old snapshot), the rest are inserted.
  const activeById = new Map(menu.filter((f) => f.isActive).map((f) => [f.id, f]));
  const keepBoxIds: number[] = [];
  const newBoxes: CleanBox[] = [];
  const messageBoxes: PricedBox[] = [];
  for (const box of order.boxes) {
    const saved = box.boxId ? existing?.boxes.find((b) => b.id === box.boxId) : undefined;
    if (saved && sameBoxContents(box, { size: saved.size, items: saved.items })) {
      keepBoxIds.push(saved.id);
      messageBoxes.push(savedBoxPriced(saved));
      continue;
    }
    const items = [];
    for (const item of box.items) {
      const flavor = activeById.get(item.flavorId);
      if (!flavor) {
        return { status: "invalid", errors: { boxes: "אחד הטעמים כבר לא זמין. כדאי לרענן את הדף." } };
      }
      items.push({ flavor, qty: item.qty });
    }
    items.sort((a, b) => a.flavor.sortOrder - b.flavor.sortOrder);
    newBoxes.push({ size: box.size, items: box.items });
    messageBoxes.push({
      size: box.size,
      items: items.map(({ flavor, qty }) => ({
        flavorId: flavor.id,
        name: flavor.name,
        qty,
        unitPrice: flavor.price,
      })),
    });
  }

  const { data, error } = await supabase.rpc("save_order", {
    p: {
      order_id: existing?.id ?? null,
      customer: { full_name: order.fullName, phone: order.phone },
      order: {
        day: order.day,
        fulfillment: order.fulfillment,
        address: order.address,
        city: order.city,
        address_details: order.addressDetails,
        courier_notes: order.courierNotes,
        recipient_name: order.recipientName,
        recipient_phone: order.recipientPhone,
        time_window: order.timeWindow,
        delivery_fee: deliveryFee(order.fulfillment),
        source: order.source,
        raw_message: order.rawMessage,
        notes: order.notes,
      },
      send: false,
      keep_box_ids: keepBoxIds,
      boxes: newBoxes.map((box) => ({
        size: box.size,
        items: box.items.map((item) => ({ flavor_id: item.flavorId, qty: item.qty })),
      })),
    },
  });
  if (error) {
    // Only the code and our own error names: never customer data.
    console.error("saveOrder: save_order", error.code, error.message === "unknown_flavor" ? error.message : "");
    if (error.message === "unknown_flavor") {
      return { status: "invalid", errors: { boxes: "אחד הטעמים כבר לא זמין. כדאי לרענן את הדף." } };
    }
    if (error.message === "box_not_full") {
      return { status: "invalid", errors: { boxes: "יש מארז שלא מלא. כל המארזים צריכים להיות מלאים." } };
    }
    return { status: "error", message: SAVE_FAILED };
  }
  const reply = SaveOrderReply.safeParse(data);
  if (!reply.success) return { status: "error", message: SAVE_FAILED };

  const waUrl = waLink(
    order.phone,
    orderSummaryMessage({
      candle: day.label,
      day: day.day,
      fulfillment: order.fulfillment,
      address: order.address,
      city: order.city,
      boxes: messageBoxes,
      menuFlavorCount: activeById.size,
      payboxLink: process.env.NEXT_PUBLIC_PAYBOX_LINK,
    }),
  );

  const previousName = reply.data.previous_name;
  return {
    status: "saved",
    orderId: reply.data.order_id,
    edited: Boolean(existing),
    total: toShekels(reply.data.grand_total),
    customerName: order.fullName,
    // When editing, the customer was "returning" only if the name actually changed.
    returningCustomer:
      previousName !== null && (!existing || previousName !== order.fullName)
        ? { previousName }
        : null,
    waUrl,
  };
}

export type ActionResult = { ok: true } | { ok: false; message: string };

const OrderId = z.number().int().positive();

export type RestoreResult =
  | { status: "ok" }
  | { status: "confirm"; kind: "closed" | "over"; message: string }
  | { status: "error"; message: string };

/**
 * Undo cancel: back to 'new' ('confirmed' if it was already paid). The day's rules are
 * re-checked, and a closed day or going over capacity needs the baker's confirmation again.
 */
export async function restoreOrder(
  orderId: number,
  confirmed: { closed: boolean; over: boolean } = { closed: false, over: false },
): Promise<RestoreResult> {
  const { supabase } = await requireUser();
  const id = OrderId.safeParse(orderId);
  if (!id.success) return { status: "error", message: "ההזמנה לא נמצאה." };

  let order, days;
  try {
    [order, days] = await Promise.all([loadOrder(supabase, id.data), loadDays(supabase)]);
  } catch (error) {
    console.error("restoreOrder: load", (error as Error).message);
    return { status: "error", message: "משהו השתבש. כדאי לנסות שוב." };
  }
  if (!order) return { status: "error", message: "ההזמנה לא נמצאה." };
  if (order.status !== "cancelled") return { status: "ok" };

  const day = days.find((d) => d.day === order.day);
  if (!day) return { status: "error", message: "היום של ההזמנה לא קיים." };
  const ruleError = dayRuleError(day, order.fulfillment);
  // The day stopped offering this service since the order was cancelled: say so, don't restore.
  if (ruleError) return { status: "error", message: `${ruleError} אי אפשר להחזיר את ההזמנה ליום הזה.` };
  // Cancelled orders aren't in "booked", so this order's boxes are added on top.
  const confirm = capacityConfirm(day, day.booked, order.boxes.length, confirmed);
  if (confirm) return { status: "confirm", ...confirm };

  const { error } = await supabase
    .from("orders")
    .update({ status: order.payment === "paid" ? "confirmed" : "new" })
    .eq("id", order.id)
    .eq("status", "cancelled");
  if (error) {
    console.error("restoreOrder", error.code);
    return { status: "error", message: "ההחזרה נכשלה. כדאי לנסות שוב." };
  }
  return { status: "ok" };
}

/** Soft cancel: status 'cancelled'. The order stays in the DB (and in "הצגת מבוטלות"). */
export async function cancelOrder(orderId: number): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const id = OrderId.safeParse(orderId);
  if (!id.success) return { ok: false, message: "ההזמנה לא נמצאה." };

  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id.data);
  if (error) {
    console.error("cancelOrder", error.code);
    return { ok: false, message: "הביטול נכשל. כדאי לנסות שוב." };
  }
  return { ok: true };
}
