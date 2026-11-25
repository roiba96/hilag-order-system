// Test helpers: the Hanukkah 2026 menu from schema.sql, for building priced boxes in tests.
import type { PricedBox } from "./pricing";
import type { BoxSize } from "./types";

export const MENU = [
  { flavorId: 1, name: "ריבה קלאסית", unitPrice: 16 },
  { flavorId: 2, name: "ריבת חלב", unitPrice: 18 },
  { flavorId: 3, name: "שוקולד", unitPrice: 20 },
  { flavorId: 4, name: "סינבון", unitPrice: 22 },
  { flavorId: 5, name: "קינדר", unitPrice: 22 },
  { flavorId: 6, name: "הרשיז", unitPrice: 24 },
] as const;

export const MENU_SIZE = MENU.length;

/** box(6, { שוקולד: 3, קינדר: 3 }) */
export function box(size: BoxSize, qtyByName: Record<string, number>): PricedBox {
  return {
    size,
    items: MENU.filter((f) => qtyByName[f.name]).map((f) => ({ ...f, qty: qtyByName[f.name] })),
  };
}

export function oneOfEach(): PricedBox {
  return { size: 6, items: MENU.map((f) => ({ ...f, qty: 1 })) };
}
