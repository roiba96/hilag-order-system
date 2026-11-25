import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { todayInJerusalem } from "@/lib/dates";
import { defaultDay } from "@/lib/frying";
import { loadDays, loadMenu, loadOrders } from "@/lib/order-data";
import { dayReminderLink, linksFor } from "@/lib/order-links";
import { nextSaleDayAfter } from "@/lib/today";
import { TodayView } from "./TodayView";

export const metadata: Metadata = { title: "היום" };

export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6 pb-24">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">היום</h1>
        <Link href="/" className="flex min-h-11 items-center px-2 font-medium underline">
          בית
        </Link>
      </header>
      <Suspense fallback={<p className="text-ink-muted">טוענת את היום…</p>}>
        <Today />
      </Suspense>
    </main>
  );
}

async function Today() {
  const { supabase } = await requireUser();
  const [orders, days, menu, frying, boxes] = await Promise.all([
    loadOrders(supabase),
    loadDays(supabase),
    loadMenu(supabase),
    supabase.from("v_frying").select("day, batch, flavor, sort_order, qty"),
    supabase.from("v_boxes_by_size").select("day, size, boxes"),
  ]);
  if (frying.error) throw new Error(`load v_frying: ${frying.error.code}`);
  if (boxes.error) throw new Error(`load v_boxes_by_size: ${boxes.error.code}`);

  // Days that serve orders, plus any day that still has orders on it.
  const withOrders = new Set(orders.filter((o) => o.status !== "cancelled").map((o) => o.day));
  const shown = days.filter((d) => d.allowsPickup || d.allowsDelivery || withOrders.has(d.day));
  // After requireUser, so the clock is read per request (Cache Components).
  const today = todayInJerusalem(new Date());
  const reminderDay = nextSaleDayAfter(shown.map((d) => d.day), today);

  const labels = Object.fromEntries(days.map((d) => [d.day, d.label]));
  const upcoming = orders.filter((o) => o.status !== "cancelled" && o.day >= today);

  return (
    <TodayView
      days={shown}
      initialDay={defaultDay(shown.map((d) => d.day), today)}
      reminderDay={reminderDay ? (shown.find((d) => d.day === reminderDay) ?? null) : null}
      orders={orders}
      menuFlavorCount={menu.filter((f) => f.isActive).length}
      fryingRows={frying.data.map((row) => ({
        day: row.day,
        batch: row.batch,
        flavor: row.flavor,
        sortOrder: row.sort_order,
        qty: Number(row.qty),
      }))}
      boxRows={boxes.data.map((row) => ({ day: row.day, size: row.size, boxes: Number(row.boxes) }))}
      reminderLinks={linksFor(upcoming, (order) => dayReminderLink(order, labels, today))}
    />
  );
}
