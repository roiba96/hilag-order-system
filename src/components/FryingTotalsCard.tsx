import { BUSINESS } from "@/lib/config";

type Props = { total: number; flavors: { name: string; qty: number }[] };

/** The whole day's frying, both batches together: what to proof and fry. */
export function FryingTotalsCard({ total, flavors }: Props) {
  return (
    <section aria-label="סך הכול לטיגון" className="rounded-card border border-line bg-card p-4">
      <p className="text-4xl font-bold">
        {total} {BUSINESS.item.plural}
      </p>
      {flavors.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
          {flavors.map((flavor) => (
            <li key={flavor.name} className="flex items-baseline justify-between gap-2 text-lg">
              <span>{flavor.name}</span>
              <span className="text-2xl font-bold">{flavor.qty}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
