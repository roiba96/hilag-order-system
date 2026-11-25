import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDays, loadMenu, loadOrders } from "@/lib/order-data";
import { linksFor, summaryLink } from "@/lib/order-links";
import { OrdersList } from "./OrdersList";

export const metadata: Metadata = { title: "הזמנות" };

export default function OrdersPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">הזמנות</h1>
        <nav className="flex items-center gap-1">
          <Link href="/" className="flex min-h-11 items-center px-2 font-medium underline">
            בית
          </Link>
          <Link
            href="/orders/new"
            className="flex min-h-11 items-center rounded-xl bg-ink px-4 font-semibold text-cream"
          >
            הזמנה חדשה
          </Link>
        </nav>
      </header>
      <Suspense fallback={<p className="text-ink-muted">טוענת הזמנות…</p>}>
        <Orders />
      </Suspense>
    </main>
  );
}

async function Orders() {
  const { supabase } = await requireUser();
  const [orders, days, menu] = await Promise.all([loadOrders(supabase), loadDays(supabase), loadMenu(supabase)]);

  // Chips for every day that serves orders (closed days still have orders to manage).
  const serviceDays = days.filter((d) => d.allowsPickup || d.allowsDelivery);
  const menuFlavorCount = menu.filter((f) => f.isActive).length;
  const labels = Object.fromEntries(days.map((d) => [d.day, d.label]));
  const unsent = orders.filter((o) => o.status !== "cancelled" && o.confirmationSentAt === null);
  return (
    <OrdersList
      orders={orders}
      days={serviceDays}
      menuFlavorCount={menuFlavorCount}
      summaryLinks={linksFor(unsent, (order) =>
        summaryLink(order, labels, menuFlavorCount, process.env.NEXT_PUBLIC_PAYBOX_LINK),
      )}
    />
  );
}
