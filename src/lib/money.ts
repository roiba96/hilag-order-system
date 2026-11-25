// Money is whole shekels everywhere in the app. The DB stores numeric(6,2), so values
// come back as 16 or "16.00"; toShekels() is the one place that converts them.

/** DB numeric → whole shekels. Throws on anything that isn't a number, so bad data can't hide. */
export function toShekels(value: number | string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Not a money value: ${String(value)}`);
  }
  return Math.round(n);
}

const grouping = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 122 → "122 ₪", 1220 → "1,220 ₪". Wrap in <Ltr> when shown inside Hebrew UI text. */
export function formatShekels(amount: number): string {
  return `${grouping.format(amount)} ₪`;
}
