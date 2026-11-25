"use client";

import { Ltr } from "@/components/Ltr";
import { formatShekels } from "@/lib/money";
import type { MenuFlavor } from "@/lib/order-data";
import { type DraftBox, draftToPriced, oneOfEachQty } from "@/lib/order-form";
import { boxDonuts, boxPrice } from "@/lib/pricing";
import { BOX_SIZES } from "@/lib/types";

type Props = {
  index: number;
  box: DraftBox;
  menu: MenuFlavor[];
  canRemove: boolean;
  onChange: (box: DraftBox) => void;
  onRemove: () => void;
};

const stepButton =
  "flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-2xl font-semibold disabled:opacity-40";

export function BoxCard({ index, box, menu, canRemove, onChange, onRemove }: Props) {
  const priced = draftToPriced(box, menu);
  const donuts = boxDonuts(priced);
  const full = donuts === box.size;
  const over = donuts > box.size;
  const title = `מארז ${index + 1}`;

  function setQty(flavorId: number, qty: number) {
    onChange({ ...box, qty: { ...box.qty, [flavorId]: Math.max(0, qty) } });
  }

  return (
    <section aria-label={title} className="rounded-card border border-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div role="group" aria-label="גודל המארז" className="flex rounded-xl border border-line p-0.5">
          {BOX_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={box.size === size}
              onClick={() => onChange({ ...box, size })}
              className={`min-h-11 min-w-14 rounded-lg px-3 font-semibold ${
                box.size === size ? "bg-ink text-cream" : ""
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p
          aria-live="polite"
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            over ? "bg-unpaid-bg text-unpaid" : full ? "bg-paid-bg text-paid" : "bg-surface"
          }`}
        >
          נבחרו {donuts} מתוך {box.size}
        </p>
        {/* "One of each" fits only when the box holds exactly one of every flavor on the menu. */}
        {box.size === menu.length && (
          <button
            type="button"
            onClick={() => onChange({ ...box, qty: oneOfEachQty(menu) })}
            className="min-h-11 rounded-xl border border-line px-3 font-medium"
          >
            אחד מכל טעם
          </button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-line">
        {menu.map((flavor) => {
          const qty = box.qty[flavor.id] ?? 0;
          return (
            <li key={flavor.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="font-medium">{flavor.name}</p>
                <p className="text-sm text-ink-muted">
                  <Ltr>{formatShekels(flavor.price)}</Ltr>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={`פחות ${flavor.name}`}
                  disabled={qty === 0}
                  onClick={() => setQty(flavor.id, qty - 1)}
                  className={stepButton}
                >
                  −
                </button>
                <span aria-label={`${flavor.name}: ${qty}`} className="w-6 text-center text-lg font-semibold">
                  {qty}
                </span>
                <button
                  type="button"
                  aria-label={`עוד ${flavor.name}`}
                  disabled={donuts >= box.size}
                  onClick={() => setQty(flavor.id, qty + 1)}
                  className={stepButton}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <p className="font-semibold">
          סה״כ מארז: <Ltr>{formatShekels(boxPrice(priced))}</Ltr>
        </p>
        {canRemove && (
          <button type="button" onClick={onRemove} className="min-h-11 rounded-xl px-3 font-medium text-unpaid">
            הסרת מארז
          </button>
        )}
      </div>
    </section>
  );
}
