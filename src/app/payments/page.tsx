import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDays, loadOrders } from "@/lib/order-data";
import { linksFor, paymentReminderLink } from "@/lib/order-links";
import { PaymentsView } from "./PaymentsView";

export const metadata: Metadata = { title: "תשלומים" };

export default function PaymentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6 pb-24">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">תשלומים</h1>
        <Link href="/" className="flex min-h-11 items-center px-2 font-medium underline">
          בית
        </Link>
      </header>
      <Suspense fallback={<p className="text-ink-muted">טוענת תשלומים…</p>}>
        <Payments />
      </Suspense>
    </main>
  );
}

async function Payments() {
  const { supabase } = await requireUser();
  const [orders, days] = await Promise.all([loadOrders(supabase), loadDays(supabase)]);
  const labels = Object.fromEntries(days.map((d) => [d.day, d.label]));
  const unpaid = orders.filter((o) => o.status !== "cancelled" && o.payment !== "paid");
  return (
    <PaymentsView
      orders={orders}
      labels={labels}
      reminderLinks={linksFor(unpaid, (order) =>
        paymentReminderLink(order, labels, process.env.NEXT_PUBLIC_PAYBOX_LINK),
      )}
    />
  );
}
