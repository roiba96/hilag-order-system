import { describe, expect, it } from "vitest";
import { dayReminderMessage } from "./messages";
import { courierText, dayReminderQueue, daySummary, fullAddress, nextSaleDayAfter, ordersFor } from "./today";

type Fulfillment = "pickup" | "delivery";
let seq = 0;
const order = (
  fulfillment: Fulfillment,
  extra: Partial<{
    id: number;
    day: string;
    status: "new" | "confirmed" | "completed" | "cancelled";
    payment: "unpaid" | "requested" | "paid";
    name: string;
    boxes: number[];
    recipientName: string | null;
    recipientPhone: string | null;
    timeWindow: string | null;
    courierNotes: string | null;
    reminderSentAt: string | null;
  }> = {},
) => {
  seq += 1;
  return {
    id: extra.id ?? seq,
    day: extra.day ?? "2026-12-07",
    fulfillment,
    status: extra.status ?? "new",
    payment: extra.payment ?? "paid",
    customerName: extra.name ?? `לקוחה ${seq}`,
    customer: { phone: "972521234567" },
    address: fulfillment === "delivery" ? "הדקל 5" : null,
    city: fulfillment === "delivery" ? "נתניה" : null,
    addressDetails: fulfillment === "delivery" ? "קומה 3" : null,
    courierNotes: extra.courierNotes ?? null,
    recipientName: extra.recipientName ?? null,
    recipientPhone: extra.recipientPhone ?? null,
    timeWindow: extra.timeWindow ?? null,
    createdAt: `2026-11-2${seq % 10}T10:00:00Z`,
    boxes: (extra.boxes ?? [6]).map((size) => ({ size })),
    reminderSentAt: extra.reminderSentAt ?? null,
  };
};

const orders = [
  order("delivery", { boxes: [6, 4], payment: "unpaid" }),
  order("pickup", { boxes: [6] }),
  order("pickup", { boxes: [4], payment: "requested", status: "completed" }),
  order("pickup", { boxes: [6, 6], status: "cancelled", payment: "unpaid" }),
  order("delivery", { day: "2026-12-08", boxes: [6] }),
];

describe("daySummary", () => {
  it("counts boxes, sizes, services and unpaid for the day, ignoring cancelled", () => {
    expect(daySummary(orders, "2026-12-07", 50)).toEqual({
      booked: 4,
      maxBoxes: 50,
      left: 46,
      boxesBySize: [
        { size: 6, count: 2 },
        { size: 4, count: 2 },
      ],
      pickups: 2,
      deliveries: 1,
      unpaid: 2,
    });
  });

  it("never shows negative room", () => {
    expect(daySummary(orders, "2026-12-07", 3).left).toBe(0);
  });
});

describe("ordersFor", () => {
  it("lists the day's active orders of one service", () => {
    expect(ordersFor(orders, "2026-12-07", "pickup")).toHaveLength(2);
    expect(ordersFor(orders, "2026-12-07", "delivery")).toHaveLength(1);
  });
});

describe("courierText", () => {
  it("writes one line per delivery: name · phone · address · boxes · window · notes", () => {
    const text = courierText([
      order("delivery", { name: "דנה כהן", boxes: [6, 4], timeWindow: "בבוקר", courierNotes: "קוד 1234" }),
      order("delivery", { name: "מאיה", boxes: [6] }),
    ]);
    expect(text).toBe(
      [
        "דנה כהן · 052-123-4567 · הדקל 5, קומה 3, נתניה · 2 מארזים · בבוקר · קוד 1234",
        "מאיה · 052-123-4567 · הדקל 5, קומה 3, נתניה · מארז אחד",
      ].join("\n"),
    );
  });

  it("sends a gift to its recipient", () => {
    expect(
      courierText([order("delivery", { name: "דנה", recipientName: "סבתא רינה", recipientPhone: "972541112222" })]),
    ).toBe("סבתא רינה · 054-111-2222 · הדקל 5, קומה 3, נתניה · מארז אחד");
  });
});

describe("fullAddress", () => {
  it("joins what's there", () => {
    expect(fullAddress({ address: "הדקל 5", addressDetails: null, city: "נתניה" })).toBe("הדקל 5, נתניה");
  });
});

describe("nextSaleDayAfter", () => {
  const days = ["2026-12-04", "2026-12-06", "2026-12-07"];
  it("finds the next sale day", () => {
    expect(nextSaleDayAfter(days, "2026-11-25")).toBe("2026-12-04");
    expect(nextSaleDayAfter(days, "2026-12-04")).toBe("2026-12-06");
    expect(nextSaleDayAfter(days, "2026-12-07")).toBeNull();
  });
});

describe("dayReminderQueue", () => {
  it("holds the day's active orders not reminded since the queue started", () => {
    const list = [
      order("pickup", { id: 101 }),
      order("delivery", { id: 102, reminderSentAt: "2026-12-06T18:00:00Z" }),
      order("pickup", { id: 103, reminderSentAt: "2026-12-06T09:00:00Z" }),
      order("pickup", { id: 104, status: "cancelled" }),
      order("pickup", { id: 105, day: "2026-12-08" }),
    ];
    const since = "2026-12-06T12:00:00Z";
    expect(dayReminderQueue(list, "2026-12-07", since, []).map((o) => o.id).sort()).toEqual([101, 103]);
    expect(dayReminderQueue(list, "2026-12-07", since, [101]).map((o) => o.id)).toEqual([103]);
  });
});

describe("dayReminderMessage: the baker's exact texts", () => {
  const base = {
    fullName: "דנה כהן",
    candle: "נר רביעי",
    day: "2026-12-07",
    isTomorrow: true,
    address: "הדקל 5, קומה 3, נתניה",
    total: 246,
  };

  it("pickup, paid", () => {
    expect(dayReminderMessage({ ...base, fulfillment: "pickup", paid: true })).toBe(
      [
        "היייי דנה! 🥰",
        "מחר זה קורה! 🍩",
        "",
        "📅 נר רביעי, יום שני 7.12",
        "📍 איסוף עצמי בעיר הדגמה, בין 15:00 ל-17:30",
        "",
        "מחכה לראות אותך! חג שמח 🕎",
      ].join("\n"),
    );
  });

  it("pickup, unpaid: adds what's left to pay", () => {
    expect(dayReminderMessage({ ...base, fulfillment: "pickup", paid: false })).toBe(
      [
        "היייי דנה! 🥰",
        "מחר זה קורה! 🍩",
        "",
        "📅 נר רביעי, יום שני 7.12",
        "📍 איסוף עצמי בעיר הדגמה, בין 15:00 ל-17:30",
        "💰 נשאר לתשלום 246 ₪ דרך PayBox",
        "",
        "מחכה לראות אותך! חג שמח 🕎",
      ].join("\n"),
    );
  });

  it("delivery, paid", () => {
    expect(dayReminderMessage({ ...base, fulfillment: "delivery", paid: true })).toBe(
      [
        "היייי דנה! 🥰",
        "מחר זה קורה! 🍩",
        "",
        "📅 נר רביעי, יום שני 7.12",
        "🚚 המשלוח יוצא מ-11:00 לכתובת: הדקל 5, קומה 3, נתניה",
        "",
        "שיהיה בתיאבון! חג שמח 🕎",
      ].join("\n"),
    );
  });

  it("delivery, unpaid", () => {
    const text = dayReminderMessage({ ...base, fulfillment: "delivery", paid: false });
    expect(text).toContain("נתניה\n💰 נשאר לתשלום 246 ₪ דרך PayBox\n\nשיהיה בתיאבון!");
  });

  it("never says 'tomorrow' when the day isn't tomorrow", () => {
    const text = dayReminderMessage({ ...base, fulfillment: "pickup", paid: true, isTomorrow: false });
    expect(text).not.toContain("מחר");
    expect(text.startsWith("היייי דנה! 🥰\n\n📅 נר רביעי")).toBe(true);
  });
});

describe("nextSaleDayAfter with extra days before Hanukkah", () => {
  const season = ["2026-12-07", "2026-12-01", "2026-12-04", "2026-12-11", "2026-12-03", "2026-12-05", "2026-12-06", "2026-12-08", "2026-12-09", "2026-12-10"];
  it("reminds for the extra days and moves on into Hanukkah", () => {
    expect(nextSaleDayAfter(season, "2026-11-30")).toBe("2026-12-01");
    expect(nextSaleDayAfter(season, "2026-12-01")).toBe("2026-12-03");
    expect(nextSaleDayAfter(season, "2026-12-03")).toBe("2026-12-04");
    expect(nextSaleDayAfter(season, "2026-12-11")).toBeNull();
  });
});
