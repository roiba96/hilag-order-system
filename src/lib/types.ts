// Hand-written types mirroring schema.sql (plus migrations in supabase/migrations/).
// Keep in sync: src/lib/schema-sync.test.ts reads schema.sql and fails on drift.
//
// Notes:
// - `type`, not `interface`: supabase-js needs these to fit Record<string, unknown>.
// - numeric(6,2) money columns arrive as numbers; convert with toShekels() (src/lib/money.ts).
// - date columns arrive as "YYYY-MM-DD" strings, timestamptz as ISO strings.
// - Identity ids are "generated always": never sent on insert.

import { BUSINESS } from "./config";

// ---------- Enums and fixed value lists ----------

export const FULFILLMENT_TYPES = ["pickup", "delivery"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const ORDER_STATUSES = ["new", "confirmed", "ready", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "requested", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** orders.source is plain text in the DB; the app only writes these values. */
export const ORDER_SOURCES = ["whatsapp", "instagram", "tiktok"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

/** From the business config; boxes.size has a matching check (size in (4, 6)) in the DB. */
export const BOX_SIZES = BUSINESS.boxSizes;
export type BoxSize = (typeof BOX_SIZES)[number];

// ---------- Tables ----------

export type FlavorRow = {
  id: number;
  name: string;
  price: number;
  sort_order: number;
  is_active: boolean;
};

export type SaleDayRow = {
  day: string;
  label: string;
  allows_pickup: boolean;
  allows_delivery: boolean;
  max_boxes: number;
  is_open: boolean;
};

export type CustomerRow = {
  id: number;
  full_name: string;
  /** Normalized: 9725XXXXXXXX (see normalizePhone). */
  phone: string;
  notes: string | null;
  created_at: string;
};

export type OrderRow = {
  id: number;
  customer_id: number;
  /** Migration 005: the name saved with this order. customers.full_name follows the latest. */
  customer_name: string;
  day: string;
  fulfillment: FulfillmentType;
  /** Delivery: street + house number. */
  address: string | null;
  city: string | null;
  /** Migration 002: floor / apartment / entrance. */
  address_details: string | null;
  /** Migration 002: for the courier, e.g. a building code. */
  courier_notes: string | null;
  /** Migration 002: recipient when it isn't the customer (a gift). */
  recipient_name: string | null;
  /** Migration 002: normalized 9725XXXXXXXX. */
  recipient_phone: string | null;
  /** A request only, not a promise. */
  time_window: string | null;
  delivery_fee: number;
  status: OrderStatus;
  payment: PaymentStatus;
  payment_requested_at: string | null;
  paid_at: string | null;
  confirmation_sent_at: string | null;
  reminder_sent_at: string | null;
  source: OrderSource;
  raw_message: string | null;
  notes: string | null;
  created_at: string;
};

export type BoxRow = {
  id: number;
  order_id: number;
  size: BoxSize;
};

export type BoxItemRow = {
  box_id: number;
  flavor_id: number;
  qty: number;
  /** Price snapshot at save time. */
  unit_price: number;
};

// ---------- Views (read-only) ----------

export type OrderTotalsView = {
  order_id: number;
  box_count: number;
  donut_count: number;
  items_total: number;
  grand_total: number;
};

export type BoxMismatchView = {
  box_id: number;
  order_id: number;
  size: BoxSize;
  filled: number;
};

/** Counts exclude cancelled orders; unpaid orders still count toward capacity. */
export type DaySummaryView = {
  day: string;
  label: string;
  max_boxes: number;
  is_open: boolean;
  boxes_booked: number;
  boxes_left: number;
  orders: number;
  pickups: number;
  deliveries: number;
  unpaid_orders: number;
  revenue: number;
};

export type FryingView = {
  day: string;
  /** delivery = ready by 11:00, pickup = from 15:00. */
  batch: FulfillmentType;
  /** "11:00:00" or "15:00:00". */
  ready_by: string;
  flavor: string;
  sort_order: number;
  qty: number;
};

export type BoxesBySizeView = {
  day: string;
  size: BoxSize;
  boxes: number;
};

// ---------- Insert / update shapes ----------

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type FlavorInsert = Optional<Omit<FlavorRow, "id">, "sort_order" | "is_active">;
export type SaleDayInsert = Optional<SaleDayRow, "allows_pickup" | "allows_delivery" | "is_open">;
export type CustomerInsert = Optional<Omit<CustomerRow, "id">, "notes" | "created_at">;
export type OrderInsert = Optional<
  Omit<OrderRow, "id">,
  | "address"
  | "city"
  | "address_details"
  | "courier_notes"
  | "recipient_name"
  | "recipient_phone"
  | "time_window"
  | "delivery_fee"
  | "status"
  | "payment"
  | "payment_requested_at"
  | "paid_at"
  | "confirmation_sent_at"
  | "reminder_sent_at"
  | "source"
  | "raw_message"
  | "notes"
  | "created_at"
>;
export type BoxInsert = Omit<BoxRow, "id">;
export type BoxItemInsert = BoxItemRow;

// ---------- supabase-js Database type ----------

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Rels extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: Rels;
};

type View<Row> = { Row: Row; Relationships: [] };

/** Pass to createClient<Database>() so queries and embedded selects are type-checked. */
export type Database = {
  public: {
    Tables: {
      flavors: Table<FlavorRow, FlavorInsert>;
      sale_days: Table<SaleDayRow, SaleDayInsert>;
      customers: Table<CustomerRow, CustomerInsert>;
      orders: Table<
        OrderRow,
        OrderInsert,
        [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_day_fkey";
            columns: ["day"];
            isOneToOne: false;
            referencedRelation: "sale_days";
            referencedColumns: ["day"];
          },
        ]
      >;
      boxes: Table<
        BoxRow,
        BoxInsert,
        [
          {
            foreignKeyName: "boxes_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ]
      >;
      box_items: Table<
        BoxItemRow,
        BoxItemInsert,
        [
          {
            foreignKeyName: "box_items_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "box_items_flavor_id_fkey";
            columns: ["flavor_id"];
            isOneToOne: false;
            referencedRelation: "flavors";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: {
      v_order_totals: View<OrderTotalsView>;
      v_box_mismatch: View<BoxMismatchView>;
      v_day_summary: View<DaySummaryView>;
      v_frying: View<FryingView>;
      v_boxes_by_size: View<BoxesBySizeView>;
    };
    Functions: {
      /** Migration 004: create or edit an order in one transaction. */
      save_order: { Args: { p: Json }; Returns: Json };
    };
    Enums: {
      fulfillment_type: FulfillmentType;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
