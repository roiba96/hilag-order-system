// Reads the menu, the sale days and saved orders. Server-side: pass a client from requireUser().
import type { QueryData, SupabaseClient } from "@supabase/supabase-js";
import { toShekels } from "./money";
import { type PricedBox, itemsTotal } from "./pricing";
import type {
  BoxSize,
  Database,
  FulfillmentType,
  OrderSource,
  OrderStatus,
  PaymentStatus,
} from "./types";

export type MenuFlavor = {
  id: number;
  name: string;
  /** Whole shekels. */
  price: number;
  sortOrder: number;
  isActive: boolean;
};

export type FormDay = {
  day: string;
  label: string;
  allowsPickup: boolean;
  allowsDelivery: boolean;
  isOpen: boolean;
  maxBoxes: number;
  /** Boxes on this day in orders that aren't cancelled (paid or not). */
  booked: number;
};

type Db = SupabaseClient<Database>;

export async function loadMenu(supabase: Db): Promise<MenuFlavor[]> {
  const { data, error } = await supabase
    .from("flavors")
    .select("id, name, price, sort_order, is_active")
    .order("sort_order");
  if (error) throw new Error(`load flavors: ${error.code}`);
  return data.map((f) => ({
    id: f.id,
    name: f.name,
    price: toShekels(f.price),
    sortOrder: f.sort_order,
    isActive: f.is_active,
  }));
}

export async function loadDays(supabase: Db): Promise<FormDay[]> {
  const [days, summary] = await Promise.all([
    supabase.from("sale_days").select("*").order("day"),
    supabase.from("v_day_summary").select("day, boxes_booked"),
  ]);
  if (days.error) throw new Error(`load sale_days: ${days.error.code}`);
  if (summary.error) throw new Error(`load v_day_summary: ${summary.error.code}`);

  const booked = new Map(summary.data.map((s) => [s.day, Number(s.boxes_booked)]));
  return days.data.map((d) => ({
    day: d.day,
    label: d.label,
    allowsPickup: d.allows_pickup,
    allowsDelivery: d.allows_delivery,
    isOpen: d.is_open,
    maxBoxes: d.max_boxes,
    booked: booked.get(d.day) ?? 0,
  }));
}

// ---------- Saved orders ----------

export type SavedBox = {
  id: number;
  size: BoxSize;
  /** Menu order; unitPrice is the snapshot saved with the box. */
  items: { flavorId: number; name: string; qty: number; unitPrice: number }[];
};

export type SavedOrder = {
  id: number;
  day: string;
  fulfillment: FulfillmentType;
  address: string | null;
  city: string | null;
  addressDetails: string | null;
  courierNotes: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  timeWindow: string | null;
  notes: string | null;
  source: OrderSource;
  status: OrderStatus;
  payment: PaymentStatus;
  confirmationSentAt: string | null;
  paymentRequestedAt: string | null;
  paidAt: string | null;
  reminderSentAt: string | null;
  deliveryFee: number;
  createdAt: string;
  /** The name this order was saved with (migration 005); use this, not customer.fullName. */
  customerName: string;
  /** The customer as they are now (latest name, phone). */
  customer: { id: number; fullName: string; phone: string };
  boxes: SavedBox[];
  /** Items at their snapshot prices + this order's delivery fee. */
  total: number;
};

// One literal (not concatenated) so supabase-js can infer the row type from it.
const ORDER_SELECT =
  "id, customer_name, day, fulfillment, address, city, address_details, courier_notes, recipient_name, recipient_phone, time_window, notes, source, status, payment, confirmation_sent_at, payment_requested_at, paid_at, reminder_sent_at, delivery_fee, created_at, customer:customers(id, full_name, phone), boxes(id, size, box_items(flavor_id, qty, unit_price, flavor:flavors(name, sort_order)))";

const ordersQuery = (supabase: Db) => supabase.from("orders").select(ORDER_SELECT);
type OrderQueryRow = QueryData<ReturnType<typeof ordersQuery>>[number];

function toSavedOrder(row: OrderQueryRow): SavedOrder {
  const boxes: SavedBox[] = [...row.boxes]
    .sort((a, b) => a.id - b.id)
    .map((box) => ({
      id: box.id,
      size: box.size,
      items: [...box.box_items]
        .sort((a, b) => a.flavor.sort_order - b.flavor.sort_order)
        .map((item) => ({
          flavorId: item.flavor_id,
          name: item.flavor.name,
          qty: item.qty,
          unitPrice: toShekels(item.unit_price),
        })),
    }));
  const deliveryFee = toShekels(row.delivery_fee);
  return {
    id: row.id,
    day: row.day,
    fulfillment: row.fulfillment,
    address: row.address,
    city: row.city,
    addressDetails: row.address_details,
    courierNotes: row.courier_notes,
    recipientName: row.recipient_name,
    recipientPhone: row.recipient_phone,
    timeWindow: row.time_window,
    notes: row.notes,
    source: row.source,
    status: row.status,
    payment: row.payment,
    confirmationSentAt: row.confirmation_sent_at,
    paymentRequestedAt: row.payment_requested_at,
    paidAt: row.paid_at,
    reminderSentAt: row.reminder_sent_at,
    deliveryFee,
    createdAt: row.created_at,
    customerName: row.customer_name,
    customer: { id: row.customer.id, fullName: row.customer.full_name, phone: row.customer.phone },
    boxes,
    total: itemsTotal(boxes) + deliveryFee,
  };
}

/** Every order of the season (a few hundred at most), by day then creation time. */
export async function loadOrders(supabase: Db): Promise<SavedOrder[]> {
  const { data, error } = await ordersQuery(supabase).order("day").order("created_at");
  if (error) throw new Error(`load orders: ${error.code}`);
  return data.map(toSavedOrder);
}

export async function loadOrder(supabase: Db, id: number): Promise<SavedOrder | null> {
  const { data, error } = await ordersQuery(supabase).eq("id", id).maybeSingle();
  if (error) throw new Error(`load order: ${error.code}`);
  return data ? toSavedOrder(data) : null;
}

/** A saved box as a priced box (snapshot prices) for describeBox / totals / messages. */
export function savedBoxPriced(box: SavedBox): PricedBox {
  return { size: box.size, items: box.items };
}
