import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoxCounts } from "@/components/BoxCounts";
import { BATCH_TITLES } from "@/components/FryingBatchCard";
import { requireUser } from "@/lib/auth";
import { BUSINESS, PICKUP_WINDOW } from "@/lib/config";
import { hebrewWeekday, shortDate } from "@/lib/dates";
import { fryingForDay } from "@/lib/frying";
import { loadDays, loadMenu, loadOrders, savedBoxPriced } from "@/lib/order-data";
import { formatPhone } from "@/lib/phone";
import { describeBox } from "@/lib/pricing";
import { fullAddress, ordersFor } from "@/lib/today";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "הדפסה" };

export default function PrintPage(props: PageProps<"/today/print">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 print:max-w-none print:p-0">
      <Suspense fallback={<p>טוענת…</p>}>
        <PrintSheet searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

const cell = "border border-ink/40 px-2 py-1 text-start align-top";

async function PrintSheet({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const day = typeof params.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : null;
  if (!day) notFound();

  const { supabase } = await requireUser();
  const [orders, days, menu, frying, boxes] = await Promise.all([
    loadOrders(supabase),
    loadDays(supabase),
    loadMenu(supabase),
    supabase.from("v_frying").select("day, batch, flavor, sort_order, qty").eq("day", day),
    supabase.from("v_boxes_by_size").select("day, size, boxes").eq("day", day),
  ]);
  if (frying.error) throw new Error(`load v_frying: ${frying.error.code}`);
  if (boxes.error) throw new Error(`load v_boxes_by_size: ${boxes.error.code}`);
  const saleDay = days.find((d) => d.day === day);
  if (!saleDay) notFound();

  const summary = fryingForDay(
    frying.data.map((r) => ({ day: r.day, batch: r.batch, flavor: r.flavor, sortOrder: r.sort_order, qty: Number(r.qty) })),
    boxes.data.map((r) => ({ day: r.day, size: r.size, boxes: Number(r.boxes) })),
    day,
  );
  const menuCount = menu.filter((f) => f.isActive).length;
  const pickups = ordersFor(orders, day, "pickup");
  const deliveries = ordersFor(orders, day, "delivery");
  const batches = [summary.delivery, summary.pickup].filter((b) => b.total > 0);

  return (
    <article className="flex flex-col gap-5 text-ink print:text-black">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/today" className="flex min-h-11 items-center font-medium underline">
          חזרה
        </Link>
        <PrintButton />
      </div>

      <header>
        <h1 className="text-2xl font-bold">
          {BUSINESS.name} · {saleDay.label} · {hebrewWeekday(day)} {shortDate(day)}
        </h1>
        <div className="text-lg">
          <p>
            {summary.total} {BUSINESS.item.plural}
          </p>
          <BoxCounts counts={summary.boxes} />
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 print:break-inside-avoid">
        {batches.length === 0 && <p>אין עדיין הזמנות ליום הזה.</p>}
        {batches.map((batch) => (
          <div key={batch.batch}>
            <h2 className="text-lg font-bold">{BATCH_TITLES[batch.batch]}</h2>
            <table className="mt-1 w-full border-collapse text-lg">
              <tbody>
                {batch.flavors.map((f) => (
                  <tr key={f.name}>
                    <td className={cell}>{f.name}</td>
                    <td className={`${cell} w-16 text-center text-xl font-bold`}>{f.qty}</td>
                  </tr>
                ))}
                <tr>
                  <td className={`${cell} font-bold`}>סה״כ</td>
                  <td className={`${cell} text-center text-xl font-bold`}>{batch.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </section>

      {pickups.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">
            איסוף עצמי ב{BUSINESS.pickupPlace} · {PICKUP_WINDOW} ({pickups.length})
          </h2>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className={cell}>שם</th>
                <th className={cell}>טלפון</th>
                <th className={cell}>מארזים</th>
                <th className={cell}>תשלום</th>
                <th className={`${cell} w-14`}>נאסף</th>
              </tr>
            </thead>
            <tbody>
              {pickups.map((order) => (
                <tr key={order.id} className="print:break-inside-avoid">
                  <td className={cell}>{order.customerName}</td>
                  <td className={cell} dir="ltr">
                    {formatPhone(order.customer.phone)}
                  </td>
                  <td className={cell}>
                    {order.boxes.map((box) => (
                      <div key={box.id}>{describeBox(savedBoxPriced(box), menuCount)}</div>
                    ))}
                  </td>
                  <td className={`${cell} ${order.payment === "paid" ? "" : "font-bold"}`}>
                    {order.payment === "paid" ? "שולם" : "לא שולם"}
                  </td>
                  <td className={cell}>{order.status === "completed" ? "✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {deliveries.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">
            משלוחים · יוצאים ב-{BUSINESS.batchTimes.delivery} ({deliveries.length})
          </h2>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className={cell}>שם</th>
                <th className={cell}>כתובת</th>
                <th className={cell}>מארזים</th>
                <th className={cell}>תשלום</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((order) => (
                <tr key={order.id} className="print:break-inside-avoid">
                  <td className={cell}>{order.recipientName ?? order.customerName}</td>
                  <td className={cell}>{fullAddress(order)}</td>
                  <td className={cell}>
                    {order.boxes.map((box) => (
                      <div key={box.id}>{describeBox(savedBoxPriced(box), menuCount)}</div>
                    ))}
                  </td>
                  <td className={`${cell} ${order.payment === "paid" ? "" : "font-bold"}`}>
                    {order.payment === "paid" ? "שולם" : "לא שולם"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </article>
  );
}
