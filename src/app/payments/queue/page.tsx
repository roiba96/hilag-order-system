import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ReminderQueue } from "@/components/ReminderQueue";
import { requireUser } from "@/lib/auth";
import { shortDate } from "@/lib/dates";
import { loadDays, loadOrders } from "@/lib/order-data";
import { paymentReminderLink } from "@/lib/order-links";
import { reminderQueue } from "@/lib/payments";
import { queueHref, queueSince, queueSkipped } from "@/lib/queue-params";

export const metadata: Metadata = { title: "תזכורות תשלום" };

export default function ReminderQueuePage(props: PageProps<"/payments/queue">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">תזכורות תשלום</h1>
        <Link href="/payments" className="flex min-h-11 items-center px-2 font-medium underline">
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

  // Start time from the server clock (the same clock that stamps payment_requested_at).
  const since = queueSince(params);
  if (!since) redirect(queueHref("/payments/queue", new Date().toISOString(), []));
  const skipped = queueSkipped(params);

  const [orders, days] = await Promise.all([loadOrders(supabase), loadDays(supabase)]);
  const queue = reminderQueue(orders, since, skipped);
  const current = queue[0] ?? null;
  const labels = Object.fromEntries(days.map((d) => [d.day, d.label]));

  return (
    <ReminderQueue
      item={
        current && {
          id: current.id,
          name: current.customerName,
          phone: current.customer.phone,
          payment: current.payment,
          confirmationSentAt: current.confirmationSentAt,
          details: `${labels[current.day] ?? ""} (${shortDate(current.day)})`,
          total: current.total,
          waHref: paymentReminderLink(current, labels, process.env.NEXT_PUBLIC_PAYBOX_LINK),
        }
      }
      remaining={queue.length}
      skipHref={queueHref("/payments/queue", since, current ? [...skipped, current.id] : skipped)}
      backHref="/payments"
      sendLabel="שליחת תזכורת תשלום"
      doneText="כל מי שעוד לא שילמה קיבלה תזכורת"
      skippedCount={skipped.length}
      kind="paymentReminder"
    />
  );
}
