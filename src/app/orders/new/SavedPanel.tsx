"use client";

import Link from "next/link";
import { useState } from "react";
import { Ltr } from "@/components/Ltr";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { formatShekels } from "@/lib/money";
import type { SaveResult } from "../actions";

type Saved = Extract<SaveResult, { status: "saved" }>;

type Props = {
  result: Saved;
  /** She chose "save and send": sending is the step that's left. */
  wantsToSend: boolean;
  /** Given for new orders (clears the form); edits link back to the list instead. */
  onNewOrder?: () => void;
};

/**
 * Shown after saving. The order must be saved before its message exists, so sending is its own
 * tap here, on a real link.
 */
export function SavedPanel({ result, wantsToSend, onNewOrder }: Props) {
  const [tapped, setTapped] = useState(false);
  const [notRecorded, setNotRecorded] = useState(false);
  const renamed =
    result.returningCustomer && result.returningCustomer.previousName !== result.customerName
      ? result.returningCustomer.previousName
      : null;

  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-4 rounded-card border border-line bg-card p-5"
    >
      <div>
        <h2 className="text-2xl font-bold">{result.edited ? "ההזמנה עודכנה" : "ההזמנה נשמרה"}</h2>
        <p className="mt-1 text-lg">
          {result.customerName} · <Ltr>{formatShekels(result.total)}</Ltr>
        </p>
        {result.returningCustomer && (
          // A neutral note, not a warning: earlier orders keep the name they were saved with.
          <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-ink">
            {result.edited ? "השם בהזמנה עודכן" : "לקוחה חוזרת"}
            {renamed ? ` · בהזמנה הקודמת: ${renamed}` : ""}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {wantsToSend && !tapped && <p className="text-lg font-semibold">נשאר רק לשלוח:</p>}
        <WhatsAppLink
          href={result.waUrl}
          orderId={result.orderId}
          kind="summary"
          className="min-h-14 rounded-xl bg-ink px-4 text-lg font-semibold text-cream"
          onTap={() => {
            setTapped(true);
            setNotRecorded(false);
          }}
          onSettled={() => undefined}
          onNotRecorded={() => setNotRecorded(true)}
        >
          {tapped ? "פתיחת ווצאפ שוב" : "שליחת סיכום ותשלום בווצאפ"}
        </WhatsAppLink>
        {!wantsToSend && !tapped && (
          <p className="text-sm text-ink-muted">
            {result.edited ? "אפשר לשלוח עכשיו סיכום מעודכן." : "הסיכום עוד לא נשלח. אפשר גם אחר כך, מרשימת ההזמנות."}
          </p>
        )}
        {notRecorded && (
          <p role="alert" className="rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid">
            ווצאפ נפתח, אבל הסימון שההודעה נשלחה לא נשמר. כדאי לבדוק ברשימת ההזמנות.
          </p>
        )}
      </div>

      {onNewOrder && (
        <button
          type="button"
          onClick={onNewOrder}
          className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg font-medium"
        >
          הזמנה חדשה
        </button>
      )}
      <Link
        href="/orders"
        className="flex min-h-12 items-center justify-center rounded-xl border border-line px-4 text-lg font-medium"
      >
        לרשימת ההזמנות
      </Link>
    </section>
  );
}
