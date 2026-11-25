import { BUSINESS } from "@/lib/config";
import type { FryingBatch } from "@/lib/frying";

export const BATCH_TITLES = {
  delivery: `סבב משלוחים · מוכן ב-${BUSINESS.batchTimes.delivery}`,
  pickup: `סבב איסוף עצמי · מוכן ב-${BUSINESS.batchTimes.pickup}`,
} as const;

/** One frying batch: total and a big quantity + bar per flavor, readable across the kitchen. */
export function FryingBatchCard({ batch }: { batch: FryingBatch }) {
  const title = BATCH_TITLES[batch.batch];
  const max = Math.max(1, ...batch.flavors.map((f) => f.qty));
  return (
    <section aria-label={title} className="rounded-card border border-line bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="shrink-0 text-3xl font-bold">{batch.total}</p>
      </div>
      {batch.flavors.length === 0 ? (
        <p className="mt-3 text-ink-muted">אין עדיין הזמנות לסבב הזה.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {batch.flavors.map((flavor) => (
            <li key={flavor.name}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xl font-medium">{flavor.name}</span>
                <span className="text-3xl font-bold">{flavor.qty}</span>
              </div>
              <div aria-hidden className="mt-1 h-3 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-ink" style={{ width: `${(flavor.qty / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
