// Guards src/lib/types.ts against drifting from schema.sql + supabase/migrations/*.sql.
// Each COLUMNS record is typed Record<keyof Row, true>, so TypeScript forces it to list
// exactly the Row's keys; this test then checks those keys against the SQL.
// When a migration adds a column: update types.ts and the record below.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type BoxItemRow,
  type BoxRow,
  type CustomerRow,
  type FlavorRow,
  type OrderRow,
  type SaleDayRow,
  FULFILLMENT_TYPES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "./types";

const sql = readFileSync(new URL("../../schema.sql", import.meta.url), "utf8");

const migrationsDir = new URL("../../supabase/migrations/", import.meta.url);
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => readFileSync(new URL(file, migrationsDir), "utf8"));

function sqlColumns(table: string): string[] {
  const match = sql.match(new RegExp(`create table ${table} \\(([\\s\\S]*?)\\n\\);`));
  if (!match) throw new Error(`table ${table} not found in schema.sql`);
  const created = match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("--") && !/^(check|primary key|unique)\b/.test(line))
    .map((line) => line.split(/\s+/)[0]);
  return [...created, ...migrationColumns(table)];
}

/** Columns added by `alter table <table> ... add column <name>` in the migrations. */
function migrationColumns(table: string): string[] {
  const added: string[] = [];
  for (const migration of migrations) {
    for (const statement of migration.matchAll(new RegExp(`alter table ${table}\\b([\\s\\S]*?);`, "g"))) {
      for (const column of statement[1].matchAll(/add column (?:if not exists )?(\w+)/g)) {
        added.push(column[1]);
      }
    }
  }
  return added;
}

function sqlEnum(name: string): string[] {
  const match = sql.match(new RegExp(`create type ${name}\\s+as enum \\(([^)]*)\\)`));
  if (!match) throw new Error(`enum ${name} not found in schema.sql`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const COLUMNS = {
  flavors: { id: true, name: true, price: true, sort_order: true, is_active: true } satisfies Record<
    keyof FlavorRow,
    true
  >,
  sale_days: {
    day: true,
    label: true,
    allows_pickup: true,
    allows_delivery: true,
    max_boxes: true,
    is_open: true,
  } satisfies Record<keyof SaleDayRow, true>,
  customers: {
    id: true,
    full_name: true,
    phone: true,
    notes: true,
    created_at: true,
  } satisfies Record<keyof CustomerRow, true>,
  orders: {
    id: true,
    customer_id: true,
    customer_name: true,
    day: true,
    fulfillment: true,
    address: true,
    city: true,
    address_details: true,
    courier_notes: true,
    recipient_name: true,
    recipient_phone: true,
    time_window: true,
    delivery_fee: true,
    status: true,
    payment: true,
    payment_requested_at: true,
    paid_at: true,
    confirmation_sent_at: true,
    reminder_sent_at: true,
    source: true,
    raw_message: true,
    notes: true,
    created_at: true,
  } satisfies Record<keyof OrderRow, true>,
  boxes: { id: true, order_id: true, size: true } satisfies Record<keyof BoxRow, true>,
  box_items: { box_id: true, flavor_id: true, qty: true, unit_price: true } satisfies Record<
    keyof BoxItemRow,
    true
  >,
};

describe("types.ts matches schema.sql", () => {
  for (const [table, columns] of Object.entries(COLUMNS)) {
    it(`table ${table}`, () => {
      expect(Object.keys(columns).sort()).toEqual(sqlColumns(table).sort());
    });
  }

  it("enums", () => {
    expect([...FULFILLMENT_TYPES]).toEqual(sqlEnum("fulfillment_type"));
    expect([...ORDER_STATUSES]).toEqual(sqlEnum("order_status"));
    expect([...PAYMENT_STATUSES]).toEqual(sqlEnum("payment_status"));
  });
});
