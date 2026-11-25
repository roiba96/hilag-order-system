import { Ltr } from "@/components/Ltr";
import { BUSINESS } from "@/lib/config";
import { formatShekels } from "@/lib/money";
import { type PricedBox, deliveryFee, orderDonuts, orderTotal } from "@/lib/pricing";
import type { FulfillmentType } from "@/lib/types";

type Props = {
  boxes: PricedBox[];
  fulfillment: FulfillmentType;
  warnings: string[];
};

/** Live summary. Display only: the server recomputes the total from DB prices when saving. */
export function SummaryCard({ boxes, fulfillment, warnings }: Props) {
  const fee = deliveryFee(fulfillment);
  return (
    <section aria-label="סיכום" className="rounded-card border border-line bg-card p-4">
      {warnings.length > 0 && (
        <div className="mb-4 rounded-xl bg-requested-bg p-3 text-requested">
          <p className="font-semibold">כדאי לבדוק:</p>
          <ul className="mt-1 list-disc ps-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <dl className="flex flex-col gap-1">
        <div className="flex justify-between">
          <dt>מארזים</dt>
          <dd>{boxes.length}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{BUSINESS.item.plural}</dt>
          <dd>{orderDonuts(boxes)}</dd>
        </div>
        {fee > 0 && (
          <div className="flex justify-between">
            <dt>משלוח</dt>
            <dd>
              <Ltr>{formatShekels(fee)}</Ltr>
            </dd>
          </div>
        )}
        <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
          <dt className="text-lg font-semibold">סה״כ</dt>
          <dd className="text-3xl font-bold">
            <Ltr>{formatShekels(orderTotal(boxes, fulfillment))}</Ltr>
          </dd>
        </div>
      </dl>
    </section>
  );
}
