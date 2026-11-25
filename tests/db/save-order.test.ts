// Database test on real Postgres (PGlite = Postgres compiled to WebAssembly, in memory).
// Applies schema.sql + every supabase/migrations/*.sql in order, the way the developer runs them in
// Supabase, then exercises save_order as the `authenticated` role.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const migrationsDir = join(root, "supabase", "migrations");

let db: PGlite;

type SaveReply = {
  order_id: number;
  customer_id: number;
  previous_name: string | null;
  grand_total: number;
};

async function save(p: object): Promise<SaveReply> {
  const result = await db.query<{ r: SaveReply }>("select save_order($1::jsonb) as r", [
    JSON.stringify(p),
  ]);
  return result.rows[0].r;
}

async function one<T>(query: string, params: unknown[] = []): Promise<T> {
  return (await db.query<T>(query, params)).rows[0];
}

async function count(table: string): Promise<number> {
  return (await one<{ n: number }>(`select count(*)::int as n from ${table}`)).n;
}

/** Runs a statement as the database owner (like the developer in the SQL Editor), then back to the app role. */
async function asOwner(statement: string): Promise<void> {
  await db.exec(`reset role; ${statement}; set role authenticated;`);
}

async function saveError(p: object): Promise<string | null> {
  try {
    await save(p);
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

const oneOfEach = { size: 6, items: [1, 2, 3, 4, 5, 6].map((flavor_id) => ({ flavor_id, qty: 1 })) };
const choc2kinder2 = { size: 4, items: [{ flavor_id: 3, qty: 2 }, { flavor_id: 5, qty: 2 }] };
const pickup = { day: "2026-12-07", fulfillment: "pickup", delivery_fee: 0, source: "whatsapp" };
const dana = { full_name: "דנה כהן", phone: "972521234567" };

beforeAll(async () => {
  db = new PGlite();
  // Supabase has these roles; policies and grants refer to them.
  await db.exec("create role anon nologin; create role authenticated nologin;");
  await db.exec(readFileSync(join(root, "schema.sql"), "utf8"));
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }
  await db.exec("set role authenticated");
}, 30_000);

describe("save_order (migration 004)", () => {
  let first: SaveReply;
  let second: SaveReply;

  it("creates a new customer and order, not sent", async () => {
    first = await save({ customer: dana, order: pickup, send: false, boxes: [oneOfEach] });
    expect(first.order_id).toBeGreaterThan(0);
    expect(first.previous_name).toBeNull();
    expect(Number(first.grand_total)).toBe(122);
    expect(
      await one("select status, payment, confirmation_sent_at from orders where id = $1", [first.order_id]),
    ).toEqual({ status: "new", payment: "unpaid", confirmation_sent_at: null });
  });

  it("reuses the customer by phone and lets the latest name win", async () => {
    second = await save({
      customer: { full_name: "דנה לוי", phone: dana.phone },
      order: {
        day: "2026-12-06",
        fulfillment: "delivery",
        address: "הדקל 5",
        city: "נתניה",
        address_details: "קומה 3",
        recipient_phone: "972541112222",
        delivery_fee: 40,
        source: "instagram",
      },
      send: true,
      boxes: [oneOfEach, choc2kinder2],
    });
    expect(second.customer_id).toBe(first.customer_id);
    expect(second.previous_name).toBe("דנה כהן");
    expect(await one("select full_name from customers where id = $1", [first.customer_id])).toEqual({
      full_name: "דנה לוי",
    });
    expect(Number(second.grand_total)).toBe(122 + 84 + 40);
  });

  it("keeps each order's own name: a new name doesn't rename earlier orders (migration 005)", async () => {
    expect(await one("select customer_name from orders where id = $1", [first.order_id])).toEqual({
      customer_name: "דנה כהן",
    });
    expect(await one("select customer_name from orders where id = $1", [second.order_id])).toEqual({
      customer_name: "דנה לוי",
    });
  });

  it("marks a sent summary as a payment request and keeps status 'new'", async () => {
    const row = await one<Record<string, unknown>>(
      "select status, payment, confirmation_sent_at, payment_requested_at, address_details from orders where id = $1",
      [second.order_id],
    );
    expect(row.status).toBe("new");
    expect(row.payment).toBe("requested");
    expect(row.confirmation_sent_at).not.toBeNull();
    expect(row.payment_requested_at).not.toBeNull();
    expect(row.address_details).toBe("קומה 3");
  });

  it("on edit keeps unchanged boxes at their old price and re-prices the rest", async () => {
    const boxes = (await db.query<{ id: number }>("select id from boxes where order_id = $1 order by id", [second.order_id])).rows;
    await asOwner("update flavors set price = 30 where name = 'שוקולד'");
    await asOwner(`update orders set payment = 'paid', status = 'confirmed' where id = ${second.order_id}`);

    const edited = await save({
      order_id: second.order_id,
      customer: { full_name: "דנה לוי", phone: dana.phone },
      order: { day: "2026-12-06", fulfillment: "delivery", address: "הדקל 7", city: "נתניה", delivery_fee: 40 },
      send: true,
      keep_box_ids: [boxes[0].id],
      boxes: [{ size: 4, items: [{ flavor_id: 3, qty: 4 }] }],
    });

    const after = (await db.query<{ id: number }>("select id from boxes where order_id = $1 order by id", [second.order_id])).rows;
    expect(after[0].id).toBe(boxes[0].id);
    expect(after[1].id).not.toBe(boxes[1].id);
    expect(
      Number((await one<{ unit_price: number }>("select unit_price from box_items where box_id = $1 and flavor_id = 3", [boxes[0].id])).unit_price),
    ).toBe(20);
    expect(Number(edited.grand_total)).toBe(122 + 4 * 30 + 40);
    expect(await one("select payment, address, address_details from orders where id = $1", [second.order_id])).toEqual({
      payment: "paid", // re-sending never downgrades paid
      address: "הדקל 7",
      address_details: null,
    });
    expect(await count(`box_items where box_id = ${boxes[1].id}`)).toBe(0);
  });

  it("is atomic: an inactive flavor saves nothing, not even a new customer", async () => {
    await asOwner("update flavors set is_active = false where name = 'הרשיז'");
    const customers = await count("customers");
    const orders = await count("orders");
    const error = await saveError({
      customer: { full_name: "חדשה", phone: "972509998877" },
      order: pickup,
      send: false,
      boxes: [{ size: 4, items: [{ flavor_id: 6, qty: 4 }] }],
    });
    expect(error).toBe("unknown_flavor");
    expect(await count("customers")).toBe(customers);
    expect(await count("orders")).toBe(orders);
  });

  it("still applies the day trigger", async () => {
    const error = await saveError({
      customer: dana,
      order: { day: "2026-12-04", fulfillment: "delivery", address: "הדקל 5", city: "נתניה", delivery_fee: 40 },
      send: false,
      boxes: [oneOfEach],
    });
    expect(error).toBe("נר ראשון: יש רק איסוף עצמי.");
  });

  it("refuses to edit an order that doesn't exist", async () => {
    expect(await saveError({ order_id: 999999, customer: dana, order: pickup, send: false, boxes: [] })).toBe(
      "order_not_found",
    );
  });

  it("can't be called by anon; only authenticated may execute", async () => {
    await db.exec("reset role; set role anon");
    expect(await saveError({ customer: dana, order: pickup, send: false, boxes: [oneOfEach] })).toContain(
      "permission denied",
    );
    await db.exec("reset role");
    const grantees = (
      await db.query<{ grantee: string }>(
        "select grantee from information_schema.routine_privileges where routine_name = 'save_order'",
      )
    ).rows.map((r) => r.grantee);
    expect(grantees).toContain("authenticated");
    expect(grantees).not.toContain("anon");
    expect(grantees).not.toContain("PUBLIC");
    await db.exec("set role authenticated");
  });
});

describe("boxes must be full (migration 007)", () => {
  const short = { size: 4, items: [{ flavor_id: 3, qty: 3 }] };
  const over = { size: 4, items: [{ flavor_id: 3, qty: 5 }] };
  const empty = { size: 6, items: [] };
  const full = { size: 4, items: [{ flavor_id: 1, qty: 4 }] };

  it("refuses a short, overfull or empty box and saves nothing, not even the customer", async () => {
    const customers = await count("customers");
    const orders = await count("orders");
    for (const bad of [short, over, empty]) {
      const error = await saveError({
        customer: { full_name: "חדשה", phone: "972507776655" },
        order: pickup,
        send: false,
        boxes: [full, bad],
      });
      expect(error).toBe("box_not_full");
    }
    expect(await count("customers")).toBe(customers);
    expect(await count("orders")).toBe(orders);
  });

  it("refuses an edit that adds one, leaving the order as it was", async () => {
    const saved = await save({ customer: dana, order: pickup, send: false, boxes: [full] });
    const kept = (await db.query<{ id: number }>("select id from boxes where order_id = $1", [saved.order_id])).rows;
    const error = await saveError({
      order_id: saved.order_id,
      customer: dana,
      order: { ...pickup, notes: "לא אמור להישמר" },
      send: false,
      keep_box_ids: kept.map((b) => b.id),
      boxes: [short],
    });
    expect(error).toBe("box_not_full");
    expect(await count(`boxes where order_id = ${saved.order_id}`)).toBe(1);
    expect(await one("select notes from orders where id = $1", [saved.order_id])).toEqual({ notes: null });
  });

  it("refuses an edit that keeps an old box that isn't full", async () => {
    const saved = await save({ customer: dana, order: pickup, send: false, boxes: [full] });
    const [old] = (await db.query<{ id: number }>("select id from boxes where order_id = $1", [saved.order_id])).rows;
    await db.query("update box_items set qty = 2 where box_id = $1", [old.id]);
    expect(
      await saveError({
        order_id: saved.order_id,
        customer: dana,
        order: pickup,
        send: false,
        keep_box_ids: [old.id],
        boxes: [],
      }),
    ).toBe("box_not_full");
  });

  it("still can't be called by anon", async () => {
    await db.exec("reset role; set role anon");
    expect(await saveError({ customer: dana, order: pickup, send: false, boxes: [full] })).toContain("permission denied");
    await db.exec("reset role; set role authenticated");
  });
});

describe("frying views (used by the טיגון page)", () => {
  it("are readable by authenticated and leave out cancelled orders", async () => {
    const day = "2026-12-08";
    const kept = await save({ customer: dana, order: { ...pickup, day }, send: false, boxes: [choc2kinder2] });
    // (An earlier test turned הרשיז off, so this box avoids it.)
    const jam6 = { size: 6, items: [{ flavor_id: 1, qty: 6 }] };
    const dropped = await save({ customer: dana, order: { ...pickup, day }, send: false, boxes: [jam6] });
    await db.exec(`update orders set status = 'cancelled' where id = ${dropped.order_id}`);

    const fry = (await db.query<{ flavor: string; qty: number }>(
      "select flavor, qty::int as qty from v_frying where day = $1 order by sort_order",
      [day],
    )).rows;
    expect(fry).toEqual([
      { flavor: "שוקולד", qty: 2 },
      { flavor: "קינדר", qty: 2 },
    ]);
    const sizes = (await db.query<{ size: number; boxes: number }>(
      "select size, boxes::int as boxes from v_boxes_by_size where day = $1",
      [day],
    )).rows;
    expect(sizes).toEqual([{ size: 4, boxes: 1 }]);
    expect(kept.order_id).toBeGreaterThan(0);
  });
});

describe("day and flavor settings (the הגדרות page)", () => {
  it("turning delivery off keeps existing delivery orders and blocks new ones", async () => {
    const day = "2026-12-09";
    const delivery = { day, fulfillment: "delivery", address: "הדקל 5", city: "נתניה", delivery_fee: 40 };
    const existing = await save({ customer: dana, order: delivery, send: false, boxes: [choc2kinder2] });

    // As the app does it: a plain update by the logged-in user.
    await db.query("update sale_days set allows_delivery = false, max_boxes = 30 where day = $1", [day]);
    expect(await one("select allows_delivery, max_boxes from sale_days where day = $1", [day])).toEqual({
      allows_delivery: false,
      max_boxes: 30,
    });

    expect(await one("select fulfillment, status from orders where id = $1", [existing.order_id])).toEqual({
      fulfillment: "delivery",
      status: "new",
    });
    expect(await saveError({ customer: dana, order: delivery, send: false, boxes: [choc2kinder2] })).toBe(
      "נר שישי: יש רק איסוף עצמי.",
    );
  });

  it("a price change only affects boxes saved afterwards", async () => {
    const day = "2026-12-10";
    const before = await save({ customer: dana, order: { ...pickup, day }, send: false, boxes: [choc2kinder2] });
    await db.query("update flavors set price = 25 where name = 'קינדר'");
    const after = await save({ customer: dana, order: { ...pickup, day }, send: false, boxes: [choc2kinder2] });
    // Chocolate is 30 (changed in an earlier test), Kinder was 22 and is now 25.
    expect(Number(before.grand_total)).toBe(2 * 30 + 2 * 22);
    expect(Number(after.grand_total)).toBe(2 * 30 + 2 * 25);
    expect(Number((await one<{ grand_total: number }>("select grand_total from v_order_totals where order_id = $1", [before.order_id])).grand_total)).toBe(104);
  });
});

describe("day trigger wording (migration 006)", () => {
  it("leads with the label, so days that aren't candles read naturally", async () => {
    await asOwner(
      "insert into sale_days (day, label, allows_pickup, allows_delivery, max_boxes) values ('2026-12-01', 'לפני החג', true, false, 20), ('2026-12-03', 'ערב החג', false, false, 20)",
    );
    const delivery = { day: "2026-12-01", fulfillment: "delivery", address: "הדקל 5", city: "נתניה", delivery_fee: 40 };
    expect(await saveError({ customer: dana, order: delivery, send: false, boxes: [oneOfEach] })).toBe(
      "לפני החג: יש רק איסוף עצמי.",
    );
    expect(
      await saveError({ customer: dana, order: { ...pickup, day: "2026-12-03" }, send: false, boxes: [oneOfEach] }),
    ).toBe("ערב החג: אין הזמנות ביום הזה.");
  });
});

describe("grants (migration 003)", () => {
  it("anon can't read any table", async () => {
    await db.exec("reset role; set role anon");
    let error: string | null = null;
    try {
      await db.query("select * from customers");
    } catch (e) {
      error = (e as Error).message;
    }
    await db.exec("reset role; set role authenticated");
    expect(error).toContain("permission denied");
  });
});
