"use client";

import { useState } from "react";
import { ChipRow } from "@/components/ChipRow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Ltr } from "@/components/Ltr";
import { ReopenLink, useWhatsAppScreen } from "@/components/whatsapp-screen";
import { shortDate } from "@/lib/dates";
import type { FormDay, SavedOrder } from "@/lib/order-data";
import { activeCountByDay, filterOrders } from "@/lib/order-filters";
import type { OrderLinks } from "@/lib/order-links";
import { cancelOrder, restoreOrder } from "./actions";
import { OrderCard } from "./OrderCard";

type Props = {
  orders: SavedOrder[];
  days: FormDay[];
  menuFlavorCount: number;
  /** Summary links of the orders that weren't sent one yet. */
  summaryLinks: OrderLinks;
};

type Confirmed = { closed: boolean; over: boolean };

/** The one question on screen at a time. */
type Dialog =
  | { type: "cancel"; order: SavedOrder }
  | { type: "restore"; order: SavedOrder }
  | { type: "restoreAnyway"; order: SavedOrder; kind: "closed" | "over"; message: string; confirmed: Confirmed };

export function OrdersList({ orders, days, menuFlavorCount, summaryLinks }: Props) {
  const { refresh, reopen, notRecorded, linkEvents } = useWhatsAppScreen();
  const [day, setDay] = useState("all");
  const [query, setQuery] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = new Map(days.map((d) => [d.day, d.label]));
  const counts = activeCountByDay(orders);
  const visible = filterOrders(orders, { day, query, showCancelled });
  const activeTotal = [...counts.values()].reduce((a, b) => a + b, 0);

  async function cancel(order: SavedOrder) {
    setDialog(null);
    setBusyId(order.id);
    setError(null);
    const result = await cancelOrder(order.id);
    setBusyId(null);
    if (!result.ok) return setError(result.message);
    refresh();
  }

  async function restore(order: SavedOrder, confirmed: Confirmed = { closed: false, over: false }) {
    setDialog(null);
    setBusyId(order.id);
    setError(null);
    const result = await restoreOrder(order.id, confirmed);
    setBusyId(null);
    if (result.status === "error") return setError(result.message);
    if (result.status === "confirm") {
      return setDialog({ type: "restoreAnyway", order, kind: result.kind, message: result.message, confirmed });
    }
    refresh();
  }

  function confirmDialog() {
    if (!dialog) return;
    if (dialog.type === "cancel") void cancel(dialog.order);
    else if (dialog.type === "restore") void restore(dialog.order);
    else void restore(dialog.order, { ...dialog.confirmed, [dialog.kind]: true });
  }

  const dialogText = !dialog
    ? { message: "", confirmLabel: "", danger: false }
    : dialog.type === "cancel"
      ? { message: `לבטל את ההזמנה של ${dialog.order.customerName}?`, confirmLabel: "כן, לבטל", danger: true }
      : dialog.type === "restore"
        ? { message: `להחזיר את ההזמנה של ${dialog.order.customerName}?`, confirmLabel: "כן, להחזיר", danger: false }
        : { message: dialog.message, confirmLabel: "כן, להחזיר", danger: dialog.kind === "closed" };

  const chip = (selected: boolean) =>
    `flex min-h-11 shrink-0 snap-start items-center gap-1 rounded-full border px-4 font-medium ${
      selected ? "border-ink bg-ink text-cream" : "border-line bg-card"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <ChipRow label="סינון לפי יום" selectedKey={day}>
        <button type="button" aria-pressed={day === "all"} onClick={() => setDay("all")} className={chip(day === "all")}>
          הכול <Ltr>({activeTotal})</Ltr>
        </button>
        {days.map((d) => (
          <button
            key={d.day}
            type="button"
            aria-pressed={day === d.day}
            onClick={() => setDay(d.day)}
            className={chip(day === d.day)}
          >
            {d.label} {shortDate(d.day)} <Ltr>({counts.get(d.day) ?? 0})</Ltr>
          </button>
        ))}
      </ChipRow>

      <div className="flex flex-col gap-2">
        <label htmlFor="search" className="sr-only">
          חיפוש לפי שם או טלפון
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון"
          autoComplete="off"
          className="min-h-12 w-full rounded-xl border border-line bg-card px-4 text-lg"
        />
        <label className="flex min-h-11 items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="size-5 accent-ink"
          />
          הצגת מבוטלות
        </label>
      </div>

      {(error ?? notRecorded) && (
        <p role="alert" className="rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid">
          {error ?? notRecorded}
        </p>
      )}
      <ReopenLink reopen={reopen} />

      <p className="text-ink-muted" aria-live="polite">
        {visible.length === 0 ? "אין הזמנות שמתאימות לחיפוש." : `${visible.length} הזמנות`}
      </p>

      <div className="flex flex-col gap-3">
        {visible.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            dayLabel={labels.get(order.day) ?? order.day}
            menuFlavorCount={menuFlavorCount}
            busy={busyId === order.id}
            summaryHref={summaryLinks[order.id] ?? null}
            linkEvents={linkEvents(order.customerName, summaryLinks[order.id] ?? null)}
            onCancel={() => setDialog({ type: "cancel", order })}
            onRestore={() => setDialog({ type: "restore", order })}
          />
        ))}
      </div>

      <ConfirmDialog
        open={dialog !== null}
        message={dialogText.message}
        confirmLabel={dialogText.confirmLabel}
        danger={dialogText.danger}
        onCancel={() => setDialog(null)}
        onConfirm={confirmDialog}
      />
    </div>
  );
}
