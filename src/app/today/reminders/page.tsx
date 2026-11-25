import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ReminderQueue } from "@/components/ReminderQueue";
import { requireUser } from "@/lib/auth";
import { shortDate, todayInJerusalem } from "@/lib/dates";
import { loadDays, loadOrders } from "@/lib/order-data";
import { dayReminderLink } from "@/lib/order-links";
import { queueHref, queueSince, queueSkipped } from "@/lib/queue-params";
import { dayReminderQueue } from "@/lib/today";

export const metadata: Metadata = { title: "תזכורות ליום" };

export default function DayRemindersPage(props: PageProps<"/today/reminders">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">תזכורות ליום</h1>
        <Link href="/today" className="flex min-h-11 items-center px-2 font-medium underline">
          סיום
        </Link>
      </header>
      <Suspense fallback={<p className="text-ink-muted">טוענת…</p>}>
        <Queue searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

async function Queue({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const day = typeof params.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : null;
  if (!day) notFound();

  // Start time from the server clock (the same clock that stamps reminder_sent_at).
  const since = queueSince(params);
  if (!since) redirect(queueHref("/today/reminders", new Date().toISOString(), [], { day }));
  const skipped = queueSkipped(params);

  const [orders, days] = await Promise.all([loadOrders(supabase), loadDays(supabase)]);
  const saleDay = days.find((d) => d.day === day);
  if (!saleDay) notFound();
  const queue = dayReminderQueue(orders, day, since, skipped);
  const current = queue[0] ?? null;
  const labels = Object.fromEntries(days.map((d) => [d.day, d.label]));
  const today = todayInJerusalem(new Date());

  return (
    <>
      <p className="text-lg">
        {saleDay.label} ({shortDate(day)}): תזכורת לכל ההזמנות של היום הזה.
      </p>
      <ReminderQueue
        item={
          current && {
            id: current.id,
            name: current.customerName,
            phone: current.customer.phone,
            payment: current.payment,
            confirmationSentAt: current.confirmationSentAt,
            details: current.fulfillment === "delivery" ? `משלוח ל${current.city ?? ""}` : "איסוף עצמי",
            total: current.total,
            waHref: dayReminderLink(current, labels, today),
          }
        }
        remaining={queue.length}
        skipHref={queueHref("/today/reminders", since, current ? [...skipped, current.id] : skipped, { day })}
        backHref="/today"
        sendLabel="שליחת תזכורת"
        doneText={`כל ההזמנות של ${saleDay.label} קיבלו תזכורת`}
        skippedCount={skipped.length}
        kind="dayReminder"
      />
    </>
  );
}
