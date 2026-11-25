import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { todayInJerusalem } from "@/lib/dates";
import { loadDays, loadMenu, loadOrder } from "@/lib/order-data";
import { bookableDays } from "@/lib/order-input";
import { savedOrderValues } from "@/lib/order-form";
import { FreshOrderForm } from "../../new/OrderForm";

export const metadata: Metadata = { title: "עריכת הזמנה" };

export default function EditOrderPage(props: PageProps<"/orders/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">עריכת הזמנה</h1>
        <Link href="/orders" className="flex min-h-11 items-center px-2 font-medium underline">
          חזרה להזמנות
        </Link>
      </header>
      <Suspense fallback={<p className="text-ink-muted">טוענת את ההזמנה…</p>}>
        <EditOrder params={props.params} />
      </Suspense>
    </main>
  );
}

async function EditOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const { supabase } = await requireUser();
  const [order, menu, days] = await Promise.all([
    loadOrder(supabase, orderId),
    loadMenu(supabase),
    loadDays(supabase),
  ]);
  if (!order) notFound();

  if (order.status === "cancelled") {
    return (
      <p className="rounded-card border border-line bg-card p-5">
        ההזמנה של {order.customerName} בוטלה, אי אפשר לערוך אותה.
      </p>
    );
  }

  // Flavors on sale, plus any no-longer-sold flavor this order already has (kept boxes).
  const used = new Set(order.boxes.flatMap((box) => box.items.map((item) => item.flavorId)));
  return (
    <FreshOrderForm
      menu={menu.filter((flavor) => flavor.isActive || used.has(flavor.id))}
      // Today and later days that take orders, plus the order's own day even if it has passed
      // or no longer takes orders.
      days={bookableDays(days, todayInJerusalem(new Date()), order.day)}
      edit={{ orderId: order.id, values: savedOrderValues(order) }}
    />
  );
}
