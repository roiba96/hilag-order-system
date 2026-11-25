"use client";

import Link from "next/link";
import { Ltr } from "@/components/Ltr";
import { PaymentBadge } from "@/components/PaymentBadge";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { shortDate } from "@/lib/dates";
import { formatShekels } from "@/lib/money";
import { type SavedOrder, savedBoxPriced } from "@/lib/order-data";
import { formatPhone, telLink } from "@/lib/phone";
import { describeBox } from "@/lib/pricing";

type Props = {
  order: SavedOrder;
  dayLabel: string;
  menuFlavorCount: number;
  busy: boolean;
  /** Summary link, built on the server; only for orders whose summary wasn't sent. */
  summaryHref: string | null;
  linkEvents: { onTap: () => void; onSettled: () => void; onNotRecorded: () => void };
  onCancel: () => void;
  onRestore: () => void;
};

const actionButton = "min-h-11 rounded-xl border border-line px-3 font-medium disabled:opacity-50";

export function OrderCard({
  order,
  dayLabel,
  menuFlavorCount,
  busy,
  summaryHref,
  linkEvents,
  onCancel,
  onRestore,
}: Props) {
  const cancelled = order.status === "cancelled";
  const sent = order.confirmationSentAt !== null;

  return (
    <article
      aria-label={order.customerName}
      className={`rounded-card border bg-card p-4 ${cancelled ? "border-dashed border-ink-muted opacity-75" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{order.customerName}</h3>
          <a href={telLink(order.customer.phone)} className="inline-flex min-h-11 items-center font-medium underline">
            <Ltr>{formatPhone(order.customer.phone)}</Ltr>
          </a>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {cancelled ? (
            <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold">בוטלה</span>
          ) : (
            <PaymentBadge order={order} />
          )}
        </div>
      </div>

      <p className="mt-1">
        {dayLabel} ({shortDate(order.day)}) ·{" "}
        {order.fulfillment === "delivery" ? `משלוח ל${order.city ?? ""}` : "איסוף עצמי"}
      </p>

      <ul className="mt-2 flex flex-col gap-0.5 text-ink-muted">
        {order.boxes.map((box) => (
          <li key={box.id}>{describeBox(savedBoxPriced(box), menuFlavorCount)}</li>
        ))}
      </ul>

      {order.notes && <p className="mt-2 rounded-xl bg-surface px-3 py-2">{order.notes}</p>}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <p className="text-xl font-bold">
          <Ltr>{formatShekels(order.total)}</Ltr>
        </p>
        {!cancelled && sent && <p className="text-sm text-ink-muted">הסיכום נשלח</p>}
      </div>

      {!cancelled && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!sent && (
            <WhatsAppLink
              href={summaryHref}
              orderId={order.id}
              kind="summary"
              className="min-h-11 flex-1 rounded-xl bg-ink px-3 font-semibold text-cream"
              {...linkEvents}
            >
              שליחת סיכום ותשלום
            </WhatsAppLink>
          )}
          <Link href={`/orders/${order.id}/edit`} className={`${actionButton} flex items-center`}>
            עריכה
          </Link>
          <button type="button" disabled={busy} onClick={onCancel} className={`${actionButton} text-unpaid`}>
            ביטול הזמנה
          </button>
        </div>
      )}

      {cancelled && (
        <div className="mt-3">
          <button type="button" disabled={busy} onClick={onRestore} className={actionButton}>
            החזרת ההזמנה
          </button>
        </div>
      )}
    </article>
  );
}
