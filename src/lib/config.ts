// Business settings in one place. After Hanukkah HILAG becomes a year-round system
// (cakes, cookies, challahs...), so UI and logic read these instead of hardcoding them.
// A later migration may move them into a settings table editable in the app.

export const BUSINESS = {
  /** The brand, always in capitals (the baker's choice). Screens, titles, messages and files read it from here. */
  name: "HILAG",
  /** Where pickups happen. */
  pickupPlace: "עיר הדגמה",
  /** Whole shekels per delivery order. */
  deliveryFee: 40,
  /** Box sizes on sale this season (boxes.size has a matching check in the DB). */
  boxSizes: [4, 6] as const,
  /** Batch ready times: delivery batch leaves with the courier, pickup batch is ready from. */
  batchTimes: { delivery: "11:00", pickup: "15:00" },
  /** When customers may come to collect. */
  pickupWindow: { from: "15:00", to: "17:30" },
  /** What one unit is called this season. */
  item: { singular: "סופגניה", plural: "סופגניות" },
} as const;

/** "בין 15:00 ל-17:30". Words, not a dash: "15:00–17:30" shows reversed inside Hebrew text. */
export const PICKUP_WINDOW = `בין ${BUSINESS.pickupWindow.from} ל-${BUSINESS.pickupWindow.to}`;
