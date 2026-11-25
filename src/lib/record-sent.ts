// What a tap on a WhatsApp button records. Server-side: pass a client of the logged-in user.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const SENT_KINDS = ["summary", "paymentReminder", "dayReminder"] as const;
export type SentKind = (typeof SENT_KINDS)[number];

/**
 * Stamps the order for one kind of message. Cancelled orders are left alone, and a paid order
 * never goes back to 'requested' (the filter is in the update itself, so a "סמני שולם" at the
 * same moment can't be overwritten).
 */
export async function recordSent(
  supabase: SupabaseClient<Database>,
  kind: SentKind,
  orderId: number,
  now: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const orders = () => supabase.from("orders");

  if (kind === "dayReminder") {
    const { error } = await orders()
      .update({ reminder_sent_at: now })
      .eq("id", orderId)
      .neq("status", "cancelled");
    return error ? { ok: false, code: error.code } : { ok: true };
  }

  if (kind === "paymentReminder") {
    const { error } = await orders()
      .update({ payment: "requested", payment_requested_at: now })
      .eq("id", orderId)
      .neq("status", "cancelled")
      .neq("payment", "paid");
    return error ? { ok: false, code: error.code } : { ok: true };
  }

  const stamped = await orders()
    .update({ confirmation_sent_at: now, payment_requested_at: now })
    .eq("id", orderId)
    .neq("status", "cancelled");
  if (stamped.error) return { ok: false, code: stamped.error.code };
  const requested = await orders()
    .update({ payment: "requested" })
    .eq("id", orderId)
    .neq("status", "cancelled")
    .eq("payment", "unpaid");
  return requested.error ? { ok: false, code: requested.error.code } : { ok: true };
}
