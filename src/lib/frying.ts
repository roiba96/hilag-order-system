// The frying summary: how many of each flavor to fry per day and batch. Pure.
// Input rows come from the v_frying and v_boxes_by_size views (cancelled orders excluded there).
import type { FulfillmentType } from "./types";

export type FryingRow = {
  day: string;
  batch: FulfillmentType;
  flavor: string;
  sortOrder: number;
  qty: number;
};

export type BoxCountRow = { day: string; size: number; boxes: number };

export type FryingBatch = {
  batch: FulfillmentType;
  total: number;
  /** Menu order. */
  flavors: { name: string; qty: number }[];
};

export type FryingDay = {
  total: number;
  /** Both batches together, menu order. */
  flavors: { name: string; qty: number }[];
  delivery: FryingBatch;
  pickup: FryingBatch;
  /** Box size → number of boxes, biggest size first. */
  boxes: { size: number; count: number }[];
};

function batchOf(rows: FryingRow[], batch: FulfillmentType): FryingBatch {
  const flavors = rows
    .filter((row) => row.batch === batch && row.qty > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({ name: row.flavor, qty: row.qty }));
  return { batch, total: flavors.reduce((sum, f) => sum + f.qty, 0), flavors };
}

function dayFlavors(rows: FryingRow[]): { name: string; qty: number }[] {
  const totals = new Map<string, { qty: number; sortOrder: number }>();
  for (const row of rows) {
    const current = totals.get(row.flavor);
    totals.set(row.flavor, { qty: (current?.qty ?? 0) + row.qty, sortOrder: row.sortOrder });
  }
  return [...totals]
    .filter(([, { qty }]) => qty > 0)
    .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    .map(([name, { qty }]) => ({ name, qty }));
}

export function fryingForDay(rows: FryingRow[], boxRows: BoxCountRow[], day: string): FryingDay {
  const dayRows = rows.filter((row) => row.day === day);
  const delivery = batchOf(dayRows, "delivery");
  const pickup = batchOf(dayRows, "pickup");
  return {
    total: delivery.total + pickup.total,
    flavors: dayFlavors(dayRows),
    delivery,
    pickup,
    boxes: boxRows
      .filter((row) => row.day === day && row.boxes > 0)
      .map((row) => ({ size: row.size, count: row.boxes }))
      .sort((a, b) => b.size - a.size),
  };
}

/** The day to show first: today if it's a sale day, else the next one, else the last one. */
export function defaultDay(days: string[], today: string): string | null {
  if (days.length === 0) return null;
  const sorted = [...days].sort();
  return sorted.find((day) => day >= today) ?? sorted[sorted.length - 1];
}
