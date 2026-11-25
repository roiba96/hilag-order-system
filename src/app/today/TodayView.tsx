"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { BoxCounts } from "@/components/BoxCounts";
import { BoxingSection } from "@/components/BoxingSection";
import { ChipRow } from "@/components/ChipRow";
import { FryingBatchCard } from "@/components/FryingBatchCard";
import { FryingTotalsCard } from "@/components/FryingTotalsCard";
import { Ltr } from "@/components/Ltr";
import { PaymentBadge } from "@/components/PaymentBadge";
import { Toast } from "@/components/Toast";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { ReopenLink, useWhatsAppScreen } from "@/components/whatsapp-screen";
import { BUSINESS, PICKUP_WINDOW } from "@/lib/config";
import { hebrewWeekday, shortDate } from "@/lib/dates";
import { type BoxCountRow, type FryingBatch, type FryingRow, fryingForDay } from "@/lib/frying";
import { formatShekels } from "@/lib/money";
import { type FormDay, type SavedOrder, savedBoxPriced } from "@/lib/order-data";
import type { OrderLinks } from "@/lib/order-links";
import { formatPhone, telLink } from "@/lib/phone";
import { describeBox } from "@/lib/pricing";
import { courierText, daySummary, fullAddress, ordersFor } from "@/lib/today";
import { markCollected, undoCollected } from "./actions";

type Props = {
  days: FormDay[];
  initialDay: string | null;
  /** The next sale day after today, for the day-before reminders. */
  reminderDay: FormDay | null;
  orders: SavedOrder[];
  menuFlavorCount: number;
  fryingRows: FryingRow[];
  boxRows: BoxCountRow[];
  /** Day reminder links of orders on days that aren't over. */
  reminderLinks: OrderLinks;
};

type ToastState = { message: string; undo?: () => void };

const smallButton = "min-h-11 rounded-xl border border-line px-3 font-medium disabled:opacity-50";

export function TodayView({
  days,
  initialDay,
  reminderDay,
  orders,
  menuFlavorCount,
  fryingRows,
  boxRows,
  reminderLinks,
}: Props) {
  const { refresh, reopen, notRecorded, linkEvents } = useWhatsAppScreen();
  const [day, setDay] = useState(initialDay ?? "");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const selected = days.find((d) => d.day === day);
  if (!selected) return <p className="text-ink-muted">אין ימי מכירה.</p>;

  const summary = daySummary(orders, day, selected.maxBoxes);
  const frying = fryingForDay(fryingRows, boxRows, day);
  const batches = [
    selected.allowsDelivery || frying.delivery.total > 0 ? frying.delivery : null,
    selected.allowsPickup || frying.pickup.total > 0 ? frying.pickup : null,
  ].filter((batch): batch is FryingBatch => batch !== null);
  const deliveries = ordersFor(orders, day, "delivery");
  const pickups = ordersFor(orders, day, "pickup");
  const percent = summary.maxBoxes > 0 ? Math.min(100, Math.round((summary.booked / summary.maxBoxes) * 100)) : 0;

  /** The reminder link of one order; nothing for a day that's over or an order already collected. */
  function reminder(order: SavedOrder) {
    const href = reminderLinks[order.id];
    if (href === undefined || order.status === "completed") return null;
    return (
      <>
        <WhatsAppLink
          href={href}
          orderId={order.id}
          kind="dayReminder"
          className={smallButton}
          {...linkEvents(order.customerName, href)}
        >
          תזכורת בווצאפ
        </WhatsAppLink>
        {order.reminderSentAt && <span className="text-sm text-ink-muted">תזכורת נשלחה</span>}
      </>
    );
  }

  async function collected(order: SavedOrder) {
    setBusyId(order.id);
    setError(null);
    const result = await markCollected(order.id);
    setBusyId(null);
    if (!result.ok) return setError(result.message);
    setToast({
      message: `${order.customerName}: נאסף`,
      undo: () => {
        setToast(null);
        void undoCollected(order.id, result.previousStatus).then((undo) => {
          if (!undo.ok) setError(undo.message ?? "הביטול נכשל.");
          refresh();
        });
      },
    });
    refresh();
  }

  async function copyForCourier() {
    const text = courierText(deliveries);
    try {
      await navigator.clipboard.writeText(text);
      setToast({ message: `הועתקו ${deliveries.length} משלוחים` });
    } catch {
      setError("ההעתקה לא הצליחה. אפשר לסמן את הטקסט ולהעתיק ידנית:\n" + text);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ChipRow label="בחירת יום" selectedKey={day}>
        {days.map((d) => (
          <button
            key={d.day}
            type="button"
            aria-pressed={d.day === day}
            onClick={() => setDay(d.day)}
            className={`flex min-h-11 shrink-0 snap-start items-center gap-1 rounded-full border px-4 font-medium ${
              d.day === day ? "border-ink bg-ink text-cream" : "border-line bg-card"
            }`}
          >
            {d.label} {shortDate(d.day)}
          </button>
        ))}
      </ChipRow>

      <section aria-label="סיכום היום" className="rounded-card border border-line bg-card p-4">
        <p className="text-lg font-semibold">
          {selected.label} · {hebrewWeekday(selected.day)} {shortDate(selected.day)}
        </p>
        <p className="mt-2 text-3xl font-bold">
          <Ltr>
            {summary.booked} / {summary.maxBoxes}
          </Ltr>{" "}
          <span className="text-lg font-medium">מארזים</span>
        </p>
        <div
          role="progressbar"
          aria-label="מארזים מתוך התקרה"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-4 overflow-hidden rounded-full bg-surface"
        >
          <div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2">נשארו {summary.left} פנויים</p>
        <div className="mt-1">
          <BoxCounts counts={summary.boxesBySize} />
        </div>
        <p className="mt-1">
          איסוף עצמי: {summary.pickups} · משלוחים: {summary.deliveries} ·{" "}
          <span className={summary.unpaid > 0 ? "font-semibold text-unpaid" : ""}>לא שולמו: {summary.unpaid}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/today/print?day=${selected.day}`} className={`${smallButton} flex items-center`}>
            הדפסה
          </Link>
          {reminderDay && (
            <Link href={`/today/reminders?day=${reminderDay.day}`} className={`${smallButton} flex items-center`}>
              תזכורות: {reminderDay.label}
            </Link>
          )}
        </div>
      </section>

      {(error ?? notRecorded) && (
        <p role="alert" className="whitespace-pre-line rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid">
          {error ?? notRecorded}
        </p>
      )}
      <ReopenLink reopen={reopen} />

      {/* The baker's order of work: proofing → frying → decorating → boxing → handing over. */}
      <h2 className="text-xl font-semibold">רשימת טיגון</h2>
      <FryingTotalsCard total={frying.total} flavors={frying.flavors} />
      {batches.map((batch) => (
        <FryingBatchCard key={batch.batch} batch={batch} />
      ))}

      <BoxingSection deliveries={deliveries} pickups={pickups} menuFlavorCount={menuFlavorCount} />

      {(selected.allowsDelivery || deliveries.length > 0) && (
        <section aria-labelledby="deliveries-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="deliveries-title" className="text-xl font-semibold">
              משלוחים · יוצאים ב-{BUSINESS.batchTimes.delivery}
            </h2>
            <button
              type="button"
              disabled={deliveries.length === 0}
              onClick={() => void copyForCourier()}
              className={smallButton}
            >
              העתקה לשליחויות
            </button>
          </div>
          {deliveries.length === 0 && <p className="text-ink-muted">אין משלוחים ביום הזה.</p>}
          {deliveries.map((order) => (
            <OrderBlock key={order.id} order={order} menuFlavorCount={menuFlavorCount}>
              <p>{fullAddress(order)}</p>
              {order.recipientName || order.recipientPhone ? (
                <p>
                  למסירה ל: {order.recipientName ?? ""}
                  {order.recipientPhone && (
                    <>
                      {" "}
                      · <Ltr>{formatPhone(order.recipientPhone)}</Ltr>
                    </>
                  )}
                </p>
              ) : null}
              {order.timeWindow && <p>שעה מבוקשת: {order.timeWindow}</p>}
              {order.courierNotes && <p>לשליח: {order.courierNotes}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {reminder(order)}
              </div>
            </OrderBlock>
          ))}
        </section>
      )}

      {(selected.allowsPickup || pickups.length > 0) && (
        <section aria-labelledby="pickups-title" className="flex flex-col gap-3">
          <h2 id="pickups-title" className="text-xl font-semibold">
            איסוף עצמי ב{BUSINESS.pickupPlace} · {PICKUP_WINDOW}
          </h2>
          {pickups.length === 0 && <p className="text-ink-muted">אין איסופים ביום הזה.</p>}
          {pickups.map((order) => (
            <OrderBlock key={order.id} order={order} menuFlavorCount={menuFlavorCount}>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {order.status === "completed" ? (
                  <span className="rounded-full bg-paid-bg px-3 py-1 font-semibold text-paid">נאסף</span>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void collected(order)}
                    className="min-h-11 flex-1 rounded-xl bg-ink px-3 font-semibold text-cream disabled:opacity-50"
                  >
                    נאסף
                  </button>
                )}
                {reminder(order)}
              </div>
            </OrderBlock>
          ))}
        </section>
      )}

      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.undo ? "ביטול" : undefined}
          onAction={toast.undo}
          onClose={closeToast}
        />
      )}
    </div>
  );
}

/** A customer card on the Today screen. Unpaid orders get a red edge and badge. */
function OrderBlock({
  order,
  menuFlavorCount,
  children,
}: {
  order: SavedOrder;
  menuFlavorCount: number;
  children: React.ReactNode;
}) {
  const unpaid = order.payment !== "paid";
  const done = order.status === "completed";
  return (
    <article
      aria-label={order.customerName}
      className={`rounded-card border-2 bg-card p-4 ${unpaid ? "border-unpaid" : "border-line"} ${done ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{order.customerName}</h3>
          <a href={telLink(order.customer.phone)} className="inline-flex min-h-11 items-center underline">
            <Ltr>{formatPhone(order.customer.phone)}</Ltr>
          </a>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <PaymentBadge order={order} />
          <span className="font-semibold">
            <Ltr>{formatShekels(order.total)}</Ltr>
          </span>
        </div>
      </div>
      <ul className="mt-1 text-ink-muted">
        {order.boxes.map((box) => (
          <li key={box.id}>{describeBox(savedBoxPriced(box), menuFlavorCount)}</li>
        ))}
      </ul>
      {order.notes && <p className="mt-1 rounded-xl bg-surface px-3 py-2">{order.notes}</p>}
      <div className="mt-1">{children}</div>
    </article>
  );
}
