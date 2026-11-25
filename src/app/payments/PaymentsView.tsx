"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Ltr } from "@/components/Ltr";
import { PaymentBadge } from "@/components/PaymentBadge";
import { Toast } from "@/components/Toast";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { ReopenLink, useWhatsAppScreen } from "@/components/whatsapp-screen";
import { shortDate } from "@/lib/dates";
import { formatShekels } from "@/lib/money";
import type { SavedOrder } from "@/lib/order-data";
import type { OrderLinks } from "@/lib/order-links";
import { paymentBeforePaid, paymentState } from "@/lib/payment-state";
import { paidOrders, paymentTotals, unpaidOrders } from "@/lib/payments";
import { formatPhone, telLink } from "@/lib/phone";
import { type PaymentSnapshot, markPaid, undoPaid } from "./actions";

type Props = {
  orders: SavedOrder[];
  /** sale day → candle label */
  labels: Record<string, string>;
  /** Payment reminder links of the orders that aren't paid. */
  reminderLinks: OrderLinks;
};

type ToastState = { message: string; undo?: { orderId: number; previous: PaymentSnapshot } };

const smallButton = "min-h-11 rounded-xl border border-line px-3 font-medium disabled:opacity-50";

export function PaymentsView({ orders, labels, reminderLinks }: Props) {
  const { refresh, reopen, notRecorded, linkEvents } = useWhatsAppScreen();
  const [requestedFirst, setRequestedFirst] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const totals = paymentTotals(orders);
  const unpaid = unpaidOrders(orders, requestedFirst);
  const paid = paidOrders(orders);
  const percent = totals.expected > 0 ? Math.round((totals.collected / totals.expected) * 100) : 0;

  async function pay(order: SavedOrder) {
    setBusyId(order.id);
    setError(null);
    const result = await markPaid(order.id);
    setBusyId(null);
    if (!result.ok) return setError(result.message);
    setToast({
      message: `${order.customerName} סומנה כשולמה`,
      undo: { orderId: order.id, previous: result.previous },
    });
    refresh();
  }

  async function undo(orderId: number, previous: PaymentSnapshot) {
    setToast(null);
    const result = await undoPaid(orderId, previous);
    if (!result.ok) return setError(result.message);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="סיכום תשלומים" className="rounded-card border border-line bg-card p-4">
        <p className="text-lg">
          נגבו <strong className="text-2xl"><Ltr>{formatShekels(totals.collected)}</Ltr></strong> מתוך{" "}
          <Ltr>{formatShekels(totals.expected)}</Ltr>
        </p>
        <div
          role="progressbar"
          aria-label="אחוז שנגבה"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 h-4 overflow-hidden rounded-full bg-surface"
        >
          <div className="h-full rounded-full bg-paid" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 font-medium text-unpaid">
          לא שולמו: {totals.unpaidCount} הזמנות · <Ltr>{formatShekels(totals.unpaidSum)}</Ltr>
        </p>
      </section>

      {totals.unpaidCount > 0 && (
        <Link
          href="/payments/queue"
          className="flex min-h-14 items-center justify-center rounded-xl bg-ink px-4 text-center text-lg font-semibold text-cream"
        >
          תזכורת תשלום לכל מי שעוד לא שילמה
        </Link>
      )}

      {(error ?? notRecorded) && (
        <p role="alert" className="rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid">
          {error ?? notRecorded}
        </p>
      )}
      <ReopenLink reopen={reopen} />

      <section aria-label="לא שולמו" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">לא שולמו</h2>
          <label className="flex min-h-11 items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={requestedFirst}
              onChange={(e) => setRequestedFirst(e.target.checked)}
              className="size-5 accent-ink"
            />
            קודם מי שכבר קיבלה בקשה
          </label>
        </div>

        {unpaid.length === 0 && <p className="text-ink-muted">כולן שילמו.</p>}

        {unpaid.map((order) => (
          <article
            key={order.id}
            aria-label={order.customerName}
            className="rounded-card border border-line bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{order.customerName}</h3>
                <a href={telLink(order.customer.phone)} className="inline-flex min-h-11 items-center underline">
                  <Ltr>{formatPhone(order.customer.phone)}</Ltr>
                </a>
              </div>
              <PaymentBadge order={order} />
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p>
                {labels[order.day] ?? ""} ({shortDate(order.day)})
              </p>
              <p className="text-xl font-bold">
                <Ltr>{formatShekels(order.total)}</Ltr>
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={() => void pay(order)}
                className="min-h-11 flex-1 rounded-xl bg-paid px-3 font-semibold text-card disabled:opacity-50"
              >
                סמני שולם
              </button>
              <WhatsAppLink
                href={reminderLinks[order.id] ?? null}
                orderId={order.id}
                kind="paymentReminder"
                className={smallButton}
                {...linkEvents(order.customerName, reminderLinks[order.id] ?? null)}
              >
                {paymentState(order) === "awaiting" ? "שליחה שוב" : "בקשת תשלום"}
              </WhatsAppLink>
            </div>
          </article>
        ))}
      </section>

      <details className="rounded-card border border-line bg-card p-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-lg font-semibold">
          שולמו: {totals.paidCount} הזמנות
        </summary>
        <ul className="mt-2 divide-y divide-line">
          {paid.map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                {order.customerName} · <Ltr>{formatShekels(order.total)}</Ltr>
              </span>
              <button
                type="button"
                onClick={() =>
                  void undo(order.id, {
                    payment: paymentBeforePaid(order),
                    status: order.status === "confirmed" ? "new" : order.status,
                    paidAt: null,
                  })
                }
                className={smallButton}
              >
                לא שולם
              </button>
            </li>
          ))}
        </ul>
      </details>

      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.undo ? "ביטול" : undefined}
          onAction={toast.undo ? () => void undo(toast.undo!.orderId, toast.undo!.previous) : undefined}
          onClose={closeToast}
        />
      )}
    </div>
  );
}
