"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { type DayOrders, normalizeDay, serviceOffWarnings } from "@/lib/day-settings";

const FAILED = "השמירה נכשלה. כדאי לנסות שוב.";

const DayInput = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isOpen: z.boolean(),
  allowsPickup: z.boolean(),
  allowsDelivery: z.boolean(),
  maxBoxes: z.number().int().min(0).max(9999),
  /** Set after the baker confirmed the "orders already use this service" warning. */
  confirmServiceOff: z.boolean(),
});

export type DayResult =
  | { status: "saved"; closedForNoService: boolean }
  | { status: "confirm"; message: string }
  | { status: "error"; message: string };

/**
 * Saves one day's settings. Turning a service off on a day that has orders of that kind
 * needs a confirmation (with the names); those orders are never changed.
 */
export async function updateDay(raw: unknown): Promise<DayResult> {
  const { supabase } = await requireUser();
  const parsed = DayInput.safeParse(raw);
  if (!parsed.success) return { status: "error", message: FAILED };
  const input = parsed.data;

  const current = await supabase.from("sale_days").select("*").eq("day", input.day).maybeSingle();
  if (current.error || !current.data) {
    if (current.error) console.error("updateDay: load", current.error.code);
    return { status: "error", message: current.error ? FAILED : "היום לא נמצא." };
  }
  const previous = {
    isOpen: current.data.is_open,
    allowsPickup: current.data.allows_pickup,
    allowsDelivery: current.data.allows_delivery,
    maxBoxes: current.data.max_boxes,
  };

  const normalized = normalizeDay(input, previous);
  if (!normalized.ok) return { status: "error", message: normalized.error };
  const next = normalized.settings;

  if (!input.confirmServiceOff) {
    const orders = await supabase
      .from("orders")
      .select("fulfillment, customer_name")
      .eq("day", input.day)
      .neq("status", "cancelled")
      .order("created_at");
    if (orders.error) {
      console.error("updateDay: orders", orders.error.code);
      return { status: "error", message: FAILED };
    }
    const byService: DayOrders = { pickup: [], delivery: [] };
    for (const order of orders.data) byService[order.fulfillment].push(order.customer_name);
    const warnings = serviceOffWarnings(previous, next, byService);
    if (warnings.length > 0) {
      return {
        status: "confirm",
        message: `${warnings.join("\n")}\nההזמנות האלה לא ישתנו. לשמור בכל זאת?`,
      };
    }
  }

  const { error } = await supabase
    .from("sale_days")
    .update({
      is_open: next.isOpen,
      allows_pickup: next.allowsPickup,
      allows_delivery: next.allowsDelivery,
      max_boxes: next.maxBoxes,
    })
    .eq("day", input.day);
  if (error) {
    console.error("updateDay: update", error.code);
    return { status: "error", message: FAILED };
  }
  return { status: "saved", closedForNoService: normalized.closedForNoService };
}

const FlavorInput = z.object({
  id: z.number().int().positive(),
  price: z.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export type FlavorResult = { ok: true } | { ok: false; message: string };

/** Price and on-sale switch for one flavor. Saved boxes keep their price snapshot. */
export async function updateFlavor(raw: unknown): Promise<FlavorResult> {
  const { supabase } = await requireUser();
  const parsed = FlavorInput.safeParse(raw);
  if (!parsed.success) return { ok: false, message: FAILED };

  const { error } = await supabase
    .from("flavors")
    .update({ price: parsed.data.price, is_active: parsed.data.isActive })
    .eq("id", parsed.data.id);
  if (error) {
    console.error("updateFlavor", error.code);
    return { ok: false, message: FAILED };
  }
  return { ok: true };
}
