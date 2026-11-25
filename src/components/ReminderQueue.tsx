"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Ltr } from "@/components/Ltr";
import { PaymentBadge } from "@/components/PaymentBadge";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { ReopenLink, useWhatsAppScreen } from "@/components/whatsapp-screen";
import { formatShekels } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { SentKind } from "@/lib/record-sent";
import type { PaymentStatus } from "@/lib/types";

export type QueueItem = {
  id: number;
  name: string;
  phone: string;
  payment: PaymentStatus;
  confirmationSentAt: string | null;
  /** e.g. "נר רביעי (7.12) · איסוף עצמי" */
  details: string;
  total: number;
  /** The message's WhatsApp link, built on the server. null = no usable phone. */
  waHref: string | null;
};

type Props = {
  item: QueueItem | null;
  remaining: number;
  /** What a send records, which is also what takes the order out of the queue. */
  kind: SentKind;
  /** The queue's URL with the current item added to the skipped list. */
  skipHref: string;
  backHref: string;
  sendLabel: string;
  doneText: string;
  skippedCount: number;
};

/**
 * One customer at a time: send (the tap opens WhatsApp) or skip. The queue itself is worked out
 * on the server from saved data + the URL, so it survives the trip to WhatsApp and back. This
 * component stays mounted between customers, keeping the "didn't open?" link of the last send.
 */
export function ReminderQueue({ item, remaining, kind, skipHref, backHref, sendLabel, doneText, skippedCount }: Props) {
  const router = useRouter();
  const [skipping, startTransition] = useTransition();
  const { pending, reopen, notRecorded, linkEvents } = useWhatsAppScreen();

  const notes = (
    <>
      {notRecorded && (
        <p role="alert" className="rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid">
          {notRecorded}
        </p>
      )}
      <ReopenLink reopen={reopen} />
    </>
  );

  if (!item) {
    return (
      <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5">
        <h2 className="text-2xl font-bold">סיימת</h2>
        <p>
          {doneText}
          {skippedCount > 0 ? ` (חוץ מ-${skippedCount} שדילגת עליהן)` : ""}.
        </p>
        {notes}
        <Link
          href={backHref}
          className="flex min-h-12 items-center justify-center rounded-xl bg-ink px-4 text-lg font-semibold text-cream"
        >
          חזרה
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      aria-busy={pending || skipping}
      className="flex flex-col gap-4 rounded-card border border-line bg-card p-5"
    >
      <p className="text-ink-muted">נשארו {remaining}</p>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">{item.name}</h2>
          <p>
            <Ltr>{formatPhone(item.phone)}</Ltr>
          </p>
        </div>
        <PaymentBadge order={item} />
      </div>
      <p className="text-lg">
        {item.details} · <Ltr>{formatShekels(item.total)}</Ltr>
      </p>

      <WhatsAppLink
        href={item.waHref}
        orderId={item.id}
        kind={kind}
        className="min-h-14 rounded-xl bg-ink px-4 text-lg font-semibold text-cream"
        {...linkEvents(item.name, item.waHref)}
      >
        {sendLabel}
      </WhatsAppLink>
      <button
        type="button"
        disabled={skipping}
        onClick={() => startTransition(() => router.replace(skipHref))}
        className="min-h-12 rounded-xl border border-line bg-surface px-4 text-lg font-medium disabled:opacity-60"
      >
        הבא (בלי לשלוח)
      </button>
      {notes}
    </section>
  );
}
