// Rules for the Day settings screen. Pure.

export type DaySettings = {
  isOpen: boolean;
  allowsPickup: boolean;
  allowsDelivery: boolean;
  maxBoxes: number;
};

/** Orders on the day that aren't cancelled, per service, with the names saved on them. */
export type DayOrders = { pickup: string[]; delivery: string[] };

export const SETTINGS_ERRORS = {
  maxBoxes: "מספר המארזים צריך להיות מספר שלם, 0 ומעלה.",
  openWithoutService: "כדי לפתוח את היום צריך להפעיל איסוף עצמי או משלוחים.",
  price: "המחיר צריך להיות מספר שלם, 0 ומעלה.",
} as const;

/**
 * An open day must offer at least one service; with both off the day is saved as closed.
 * Returns the settings to store, or an error when the baker asked to open a day with no service.
 */
export function normalizeDay(
  next: DaySettings,
  previous: DaySettings,
): { ok: true; settings: DaySettings; closedForNoService: boolean } | { ok: false; error: string } {
  const noService = !next.allowsPickup && !next.allowsDelivery;
  if (noService && next.isOpen && !previous.isOpen) {
    return { ok: false, error: SETTINGS_ERRORS.openWithoutService };
  }
  if (noService && next.isOpen) {
    return { ok: true, settings: { ...next, isOpen: false }, closedForNoService: true };
  }
  return { ok: true, settings: next, closedForNoService: false };
}

function countText(count: number, one: string, many: (n: number) => string): string {
  return count === 1 ? one : many(count);
}

/**
 * Warnings for turning a service off on a day that already has orders of that kind.
 * Those orders are never changed; the baker decides what to do with them.
 */
export function serviceOffWarnings(previous: DaySettings, next: DaySettings, orders: DayOrders): string[] {
  const warnings: string[] = [];
  if (previous.allowsDelivery && !next.allowsDelivery && orders.delivery.length > 0) {
    warnings.push(
      countText(
        orders.delivery.length,
        "יש הזמנת משלוח אחת ביום הזה",
        (n) => `יש ${n} הזמנות משלוח ביום הזה`,
      ) + `: ${namesList(orders.delivery)}`,
    );
  }
  if (previous.allowsPickup && !next.allowsPickup && orders.pickup.length > 0) {
    warnings.push(
      countText(
        orders.pickup.length,
        "יש הזמנת איסוף עצמי אחת ביום הזה",
        (n) => `יש ${n} הזמנות איסוף עצמי ביום הזה`,
      ) + `: ${namesList(orders.pickup)}`,
    );
  }
  return warnings;
}

/** "דנה, מאיה, רונית ועוד 2". */
export function namesList(names: string[], max = 5): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} ועוד ${names.length - max}`;
}

/** A whole number ≥ 0 typed into a field, or null. */
export function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,5}$/.test(trimmed)) return null;
  return Number(trimmed);
}
