"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ORDER_STATUSES } from "@/lib/types";

const OrderId = z.number().int().positive();
const FAILED = "משהו השתבש. כדאי לנסות שוב.";

export type CollectedResult = { ok: true; previousStatus: string } | { ok: false; message: string };

/** "נאסף": a pickup was collected (status 'completed'). Returns the status to undo to. */
export async function markCollected(orderId: number): Promise<CollectedResult> {
  const { supabase } = await requireUser();
  const id = OrderId.safeParse(orderId);
  if (!id.success) return { ok: false, message: "ההזמנה לא נמצאה." };

  const current = await supabase.from("orders").select("status").eq("id", id.data).maybeSingle();
  if (current.error || !current.data) {
    if (current.error) console.error("markCollected: load", current.error.code);
    return { ok: false, message: current.error ? FAILED : "ההזמנה לא נמצאה." };
  }
  if (current.data.status === "cancelled") return { ok: false, message: "ההזמנה בוטלה." };

  const { error } = await supabase.from("orders").update({ status: "completed" }).eq("id", id.data);
  if (error) {
    console.error("markCollected", error.code);
    return { ok: false, message: FAILED };
  }
  return { ok: true, previousStatus: current.data.status };
}

/** Undo "נאסף": back to the status it had before. */
export async function undoCollected(orderId: number, previousStatus: string): Promise<{ ok: boolean; message?: string }> {
  const { supabase } = await requireUser();
  const id = OrderId.safeParse(orderId);
  const status = z.enum(ORDER_STATUSES).exclude(["cancelled", "completed"]).safeParse(previousStatus);
  if (!id.success || !status.success) return { ok: false, message: FAILED };

  const { error } = await supabase
    .from("orders")
    .update({ status: status.data })
    .eq("id", id.data)
    .eq("status", "completed");
  if (error) {
    console.error("undoCollected", error.code);
    return { ok: false, message: FAILED };
  }
  return { ok: true };
}

