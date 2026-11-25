"use client";

import { useState } from "react";
import { BoxCounts } from "@/components/BoxCounts";
import { ChipRow } from "@/components/ChipRow";
import { FryingBatchCard } from "@/components/FryingBatchCard";
import { BUSINESS } from "@/lib/config";
import { shortDate } from "@/lib/dates";
import { type BoxCountRow, type FryingBatch, type FryingRow, fryingForDay } from "@/lib/frying";
import type { FormDay } from "@/lib/order-data";

type Props = {
  days: FormDay[];
  initialDay: string | null;
  rows: FryingRow[];
  boxRows: BoxCountRow[];
};


/** Read-only frying summary, built to be read from across the kitchen. */
export function FryingView({ days, initialDay, rows, boxRows }: Props) {
  const [day, setDay] = useState(initialDay ?? "");
  const selected = days.find((d) => d.day === day);

  if (!selected) return <p className="text-ink-muted">אין ימי מכירה.</p>;

  const summary = fryingForDay(rows, boxRows, day);
  // A batch is shown when the day offers it, or when orders for it exist anyway.
  const batches = [
    selected.allowsDelivery || summary.delivery.total > 0 ? summary.delivery : null,
    selected.allowsPickup || summary.pickup.total > 0 ? summary.pickup : null,
  ].filter((batch): batch is FryingBatch => batch !== null);

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
        <p className="text-lg">
          {selected.label} ({shortDate(selected.day)})
        </p>
        <p className="mt-1 text-4xl font-bold">
          {summary.total} {BUSINESS.item.plural}
        </p>
        <div className="mt-2 text-lg">
          <BoxCounts counts={summary.boxes} />
        </div>
      </section>

      {batches.map((batch) => (
        <FryingBatchCard key={batch.batch} batch={batch} />
      ))}
    </div>
  );
}

