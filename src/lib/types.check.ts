// Compile-time only (never imported, nothing runs): proves the Database type works with
// supabase-js, including embedded selects across the foreign keys. `npm run build` and
// `npx tsc --noEmit` fail if any of these assertions stops holding.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BoxSize, Database, FulfillmentType, PaymentStatus } from "./types";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type DataOf<Q> = Q extends PromiseLike<{ data: infer D }> ? NonNullable<D> : never;

declare const db: SupabaseClient<Database>;

// An order with its customer, its boxes and each box's flavors: the shape the Orders list needs.
export const orderListQuery = () =>
  db
    .from("orders")
    .select(
      "id, day, fulfillment, payment, customer:customers(full_name, phone), boxes(size, box_items(qty, unit_price, flavor:flavors(name)))",
    );
type Order = DataOf<ReturnType<typeof orderListQuery>>[number];

export type OrderChecks = [
  Expect<Equal<Order["fulfillment"], FulfillmentType>>,
  Expect<Equal<Order["payment"], PaymentStatus>>,
  Expect<Equal<Order["customer"], { full_name: string; phone: string }>>,
  Expect<Equal<Order["boxes"][number]["size"], BoxSize>>,
  Expect<Equal<Order["boxes"][number]["box_items"][number]["flavor"], { name: string }>>,
];

// Views are readable and typed.
export const daySummaryQuery = () => db.from("v_day_summary").select("day, boxes_booked, max_boxes");
type DaySummary = DataOf<ReturnType<typeof daySummaryQuery>>[number];

export type ViewChecks = [Expect<Equal<DaySummary["boxes_booked"], number>>];
