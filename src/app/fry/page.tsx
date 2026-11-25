import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { todayInJerusalem } from "@/lib/dates";
import { defaultDay } from "@/lib/frying";
import { loadDays } from "@/lib/order-data";
import { FryingView } from "./FryingView";

export const metadata: Metadata = { title: "טיגון" };

export default function FryingPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">טיגון</h1>
        <Link href="/" className="flex min-h-11 items-center px-2 font-medium underline">
          בית
        </Link>
      </header>
      <Suspense fallback={<p className="text-ink-muted">טוענת את רשימת הטיגון…</p>}>
        <Frying />
      </Suspense>
    </main>
  );
}

async function Frying() {
  const { supabase } = await requireUser();
  const [days, frying, boxes] = await Promise.all([
    loadDays(supabase),
    supabase.from("v_frying").select("day, batch, flavor, sort_order, qty"),
    supabase.from("v_boxes_by_size").select("day, size, boxes"),
  ]);
  if (frying.error) throw new Error(`load v_frying: ${frying.error.code}`);
  if (boxes.error) throw new Error(`load v_boxes_by_size: ${boxes.error.code}`);

  // Days that serve orders, plus any day that still has orders to fry.
  const withOrders = new Set(frying.data.map((row) => row.day));
  const shown = days.filter((d) => d.allowsPickup || d.allowsDelivery || withOrders.has(d.day));
  // After requireUser, so the clock is read per request (Cache Components).
  const initialDay = defaultDay(shown.map((d) => d.day), todayInJerusalem(new Date()));

  return (
    <FryingView
      days={shown}
      initialDay={initialDay}
      rows={frying.data.map((row) => ({
        day: row.day,
        batch: row.batch,
        flavor: row.flavor,
        sortOrder: row.sort_order,
        qty: Number(row.qty),
      }))}
      boxRows={boxes.data.map((row) => ({ day: row.day, size: row.size, boxes: Number(row.boxes) }))}
    />
  );
}
