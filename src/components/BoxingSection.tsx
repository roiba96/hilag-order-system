import { BUSINESS } from "@/lib/config";
import { type SavedOrder, savedBoxPriced } from "@/lib/order-data";
import { describeBox } from "@/lib/pricing";

type Props = { deliveries: SavedOrder[]; pickups: SavedOrder[]; menuFlavorCount: number };

/** Packing list: one row per order, the 11:00 deliveries first, then the 15:00 pickups. */
export function BoxingSection({ deliveries, pickups, menuFlavorCount }: Props) {
  const groups = [
    { title: `משלוחים · ${BUSINESS.batchTimes.delivery}`, orders: deliveries, label: "משלוח" },
    { title: `איסוף עצמי · ${BUSINESS.batchTimes.pickup}`, orders: pickups, label: "איסוף עצמי" },
  ].filter((group) => group.orders.length > 0);

  return (
    <section aria-labelledby="boxing-title" className="flex flex-col gap-3">
      <h2 id="boxing-title" className="text-xl font-semibold">
        אריזה
      </h2>
      {groups.length === 0 && <p className="text-ink-muted">אין הזמנות לארוז ביום הזה.</p>}
      {groups.map((group) => (
        <div key={group.title} className="rounded-card border border-line bg-card p-4">
          <h3 className="text-lg font-semibold">{group.title}</h3>
          <ul className="mt-1 divide-y divide-line">
            {group.orders.map((order) => (
              <li key={order.id} className="py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold">{order.customerName}</span>
                  <span className="shrink-0 text-ink-muted">{group.label}</span>
                </div>
                {order.recipientName && <p className="text-ink-muted">למסירה ל: {order.recipientName}</p>}
                <ul className="mt-1 text-lg">
                  {order.boxes.map((box) => (
                    <li key={box.id}>{describeBox(savedBoxPriced(box), menuFlavorCount)}</li>
                  ))}
                </ul>
                {order.notes && <p className="mt-1 rounded-xl bg-surface px-3 py-2">{order.notes}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
