"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/types";

const OrderId = z.number().int().positive();
const FAILED = "משהו השתבש. כדאי לנסות שוב.";

const Previous = z.object({
  payment: z.enum(PAYMENT_STATUSES),
  status: z.enum(ORDER_STATUSES),
  paidAt: z.string().nullable(),
});
export type PaymentSnapshot = z.infer<typeof Previous>;

export type MarkPaidResult = { ok: true; previous: PaymentSnapshot } | { ok: false; message: string };

/** "סמני שולם": payment 'paid' + paid_at; a 'new' order becomes 'confirmed'. Returns what to undo to. */
export async function markPaid(orderId: number): Promise<MarkPaidResult> {
  const { supabase } = await requireUser();
  const id = OrderId.safeParse(orderId);
  if (!id.success) return { ok: false, message: "ההזמנה לא נמצאה." };

  const current = await supabase
    .from("orders")
    .select("payment, status, paid_at")
    .eq("id", id.data)
    .maybeSingle();
  if (current.error || !current.data) {
    if (current.error) console.error("markPaid: load", current.error.code);
    return { ok: false, message: current.error ? FAILED : "ההזמנה לא נמצאה." };
  }
  if (current.data.status === "cancelled") return { ok: false, message: "ההזמנה בוטלה." };
  const previous = {
    payment: current.data.payment,
    status: current.data.status,
    paidAt: current.data.paid_at,
  };
  if (previous.payment === "paid") return { ok: true, previous };

  const { error } = await supabase
    .from("orders")
    .update({
      payment: "paid",
      paid_at: new Date().toISOString(),
      ...(previous.status === "new" ? { status: "confirmed" as const } : {}),
    })
    .eq("id", id.data);
  if (error) {
    console.error("markPaid: update", error.code);
    return { ok: false, message: FAILED };
  }
  return { ok: true, previous };
}

export type UndoResult = { ok: true } | { ok: false; message: string };

/** Undo "סמני שולם": restores the payment, status and paid_at from before, if still paid. */
export async function undoPaid(orderId: number, previous: PaymentSnapshot): Promise<UndoResult> {
  const { supabase } = await requireUser();
  const id = OrderId.safeParse(orderId);
  const prev = Previous.safeParse(previous);
  if (!id.success || !prev.success) return { ok: false, message: FAILED };

  const { error } = await supabase
    .from("orders")
    .update({ payment: prev.data.payment, status: prev.data.status, paid_at: prev.data.paidAt })
    .eq("id", id.data)
    .eq("payment", "paid");
  if (error) {
    console.error("undoPaid", error.code);
    return { ok: false, message: FAILED };
  }
  return { ok: true };
}
