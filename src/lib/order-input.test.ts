import { describe, expect, it } from "vitest";
import {
  type DayRules,
  type OrderInput,
  ORDER_ERRORS,
  OrderInputSchema,
  bookableDays,
  capacityConfirm,
  cleanBox,
  dayRuleError,
  pastDayError,
  sameBoxContents,
  validateOrder,
} from "./order-input";
import { PHONE_ERRORS } from "./phone";

const base: OrderInput = {
  fullName: "  דנה כהן ",
  phone: "052-123-4567",
  day: "2026-12-07",
  fulfillment: "pickup",
  address: "",
  city: "",
  addressDetails: "",
  courierNotes: "",
  recipientName: "",
  recipientPhone: "",
  timeWindow: "",
  notes: "",
  source: "whatsapp",
  rawMessage: "",
  boxes: [{ size: 6, items: [1, 2, 3, 4, 5, 6].map((flavorId) => ({ flavorId, qty: 1 })) }],
  confirmClosed: false,
  confirmOver: false,
};

describe("validateOrder", () => {
  it("accepts a complete pickup order and cleans it", () => {
    const result = validateOrder(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.fullName).toBe("דנה כהן");
    expect(result.order.phone).toBe("972521234567");
    expect(result.order.address).toBeNull();
    expect(result.order.notes).toBeNull();
  });

  it("requires name, a valid phone and a day", () => {
    const result = validateOrder({ ...base, fullName: " ", phone: "123", day: "" });
    expect(result).toEqual({
      ok: false,
      errors: { fullName: ORDER_ERRORS.fullName, phone: PHONE_ERRORS.invalid, day: ORDER_ERRORS.day },
    });
  });

  it("requires address and city for delivery only", () => {
    const delivery = validateOrder({ ...base, fulfillment: "delivery" });
    expect(delivery.ok).toBe(false);
    if (!delivery.ok) {
      expect(delivery.errors.address).toBe(ORDER_ERRORS.address);
      expect(delivery.errors.city).toBe(ORDER_ERRORS.city);
    }
  });

  it("requires a house number in the street", () => {
    const noNumber = validateOrder({ ...base, fulfillment: "delivery", address: "הדקל", city: "נתניה" });
    expect(!noNumber.ok && noNumber.errors.address).toBe(ORDER_ERRORS.houseNumber);
    for (const address of ["הדקל 5", "5 הדקל", "רחוב הרצל 12א"]) {
      expect(validateOrder({ ...base, fulfillment: "delivery", address, city: "נתניה" }).ok).toBe(true);
    }
  });

  it("validates and normalizes the recipient's phone, which is optional", () => {
    const delivery = { ...base, fulfillment: "delivery" as const, address: "הדקל 5", city: "נתניה" };
    const bad = validateOrder({ ...delivery, recipientPhone: "12345" });
    expect(!bad.ok && bad.errors.recipientPhone).toBe(ORDER_ERRORS.recipientPhone);
    const good = validateOrder({ ...delivery, recipientName: "סבתא רינה", recipientPhone: "+972 54-111-2222" });
    expect(good.ok && good.order.recipientPhone).toBe("972541112222");
    expect(good.ok && good.order.recipientName).toBe("סבתא רינה");
    const none = validateOrder(delivery);
    expect(none.ok && none.order.recipientPhone).toBeNull();
  });

  it("keeps the delivery details for delivery and drops them for pickup", () => {
    const filled = {
      address: " הדקל 5 ",
      city: "נתניה",
      addressDetails: "קומה 3, דירה 12",
      courierNotes: "קוד לבניין 1234",
      recipientName: "סבתא רינה",
      recipientPhone: "054-111-2222",
      timeWindow: "בבוקר",
    };
    const delivery = validateOrder({ ...base, ...filled, fulfillment: "delivery" });
    const pickup = validateOrder({ ...base, ...filled, fulfillment: "pickup" });
    expect(delivery.ok && delivery.order).toMatchObject({
      address: "הדקל 5",
      addressDetails: "קומה 3, דירה 12",
      courierNotes: "קוד לבניין 1234",
      recipientName: "סבתא רינה",
      recipientPhone: "972541112222",
      timeWindow: "בבוקר",
    });
    expect(pickup.ok && pickup.order).toMatchObject({
      address: null,
      city: null,
      addressDetails: null,
      courierNotes: null,
      recipientName: null,
      recipientPhone: null,
      timeWindow: null,
    });
  });

  it("needs at least one box", () => {
    const result = validateOrder({ ...base, boxes: [] });
    expect(!result.ok && result.errors.boxes).toBe(ORDER_ERRORS.noBoxes);
  });

  it("blocks every box that isn't exactly full, naming it, new or edited", () => {
    const full = { size: 4 as const, items: [{ flavorId: 3, qty: 4 }] };
    const cases = [
      { box: { size: 4 as const, items: [{ flavorId: 3, qty: 0 }] }, says: "מארז 2: נבחרו 0 מתוך 4" },
      { box: { size: 4 as const, items: [] }, says: "מארז 2: נבחרו 0 מתוך 4" },
      { box: { size: 4 as const, items: [{ flavorId: 3, qty: 3 }] }, says: "מארז 2: נבחרו 3 מתוך 4" },
      { box: { size: 4 as const, items: [{ flavorId: 3, qty: 5 }] }, says: "מארז 2: נבחרו 5 מתוך 4" },
      { box: { size: 6 as const, items: [{ flavorId: 3, qty: 2 }, { flavorId: 5, qty: 3 }] }, says: "מארז 2: נבחרו 5 מתוך 6" },
    ];
    for (const orderId of [undefined, 7]) {
      for (const { box, says } of cases) {
        const input = { ...base, ...(orderId ? { orderId } : {}), boxes: [full, { ...box, ...(orderId ? { boxId: 5 } : {}) }] };
        const result = validateOrder(input);
        expect(!result.ok && result.errors.boxes).toBe(says);
        const parsed = OrderInputSchema.safeParse(input);
        expect(parsed.success).toBe(false);
        expect(parsed.error?.issues[0]).toMatchObject({ path: ["boxes", 1], message: says });
      }
    }
  });

  it("accepts full boxes of both sizes", () => {
    const boxes = [
      { size: 4 as const, items: [{ flavorId: 3, qty: 4 }] },
      { size: 6 as const, items: [{ flavorId: 3, qty: 3 }, { flavorId: 5, qty: 3 }] },
    ];
    expect(validateOrder({ ...base, boxes }).ok).toBe(true);
    expect(OrderInputSchema.safeParse({ ...base, boxes }).success).toBe(true);
  });
});

describe("sameBoxContents", () => {
  const a = { size: 6 as const, items: [{ flavorId: 3, qty: 3 }, { flavorId: 5, qty: 3 }] };

  it("ignores item order", () => {
    expect(sameBoxContents(a, { size: 6, items: [{ flavorId: 5, qty: 3 }, { flavorId: 3, qty: 3 }] })).toBe(true);
  });

  it("notices a different size, quantity or flavor", () => {
    expect(sameBoxContents(a, { ...a, size: 4 })).toBe(false);
    expect(sameBoxContents(a, { size: 6, items: [{ flavorId: 3, qty: 2 }, { flavorId: 5, qty: 3 }] })).toBe(false);
    expect(sameBoxContents(a, { size: 6, items: [{ flavorId: 3, qty: 3 }, { flavorId: 6, qty: 3 }] })).toBe(false);
    expect(sameBoxContents(a, { size: 6, items: [{ flavorId: 3, qty: 6 }] })).toBe(false);
  });
});

describe("cleanBox", () => {
  it("keeps the saved box id when editing", () => {
    expect(cleanBox({ boxId: 7, size: 4, items: [{ flavorId: 3, qty: 4 }] }).boxId).toBe(7);
  });

  it("merges repeated flavors and drops zeros", () => {
    expect(
      cleanBox({
        size: 6,
        items: [
          { flavorId: 3, qty: 2 },
          { flavorId: 5, qty: 0 },
          { flavorId: 3, qty: 1 },
        ],
      }),
    ).toEqual({ size: 6, items: [{ flavorId: 3, qty: 3 }] });
  });
});

const fourth: DayRules = {
  label: "נר רביעי",
  allowsPickup: true,
  allowsDelivery: true,
  isOpen: true,
  maxBoxes: 50,
};
const first: DayRules = { ...fourth, label: "נר ראשון", allowsDelivery: false, maxBoxes: 20 };
const saturday: DayRules = { ...fourth, label: "נר שני (שבת)", allowsPickup: false, allowsDelivery: false, isOpen: false, maxBoxes: 0 };

describe("dayRuleError", () => {
  it("blocks delivery on pickup-only days", () => {
    expect(dayRuleError(first, "delivery")).toBe("נר ראשון: יש רק איסוף עצמי.");
    expect(dayRuleError(first, "pickup")).toBeNull();
  });

  it("blocks days with no service at all", () => {
    expect(dayRuleError(saturday, "pickup")).toBe("נר שני (שבת): אין הזמנות ביום הזה.");
  });

  it("allows both on regular days", () => {
    expect(dayRuleError(fourth, "delivery")).toBeNull();
  });
});

describe("capacityConfirm", () => {
  const none = { closed: false, over: false };

  it("is quiet under the limit", () => {
    expect(capacityConfirm(fourth, 40, 10, none)).toBeNull();
  });

  it("asks before going over, with the amount (spec wording)", () => {
    expect(capacityConfirm(fourth, 50, 2, none)).toEqual({
      kind: "over",
      message: "נר רביעי יעבור את התקרה ב-2 מארזים. לשמור בכל זאת?",
    });
    expect(capacityConfirm(fourth, 49, 2, none)?.message).toBe(
      "נר רביעי יעבור את התקרה במארז אחד. לשמור בכל זאת?",
    );
  });

  it("asks about a closed day first, then capacity", () => {
    const closedFull = { ...fourth, isOpen: false };
    expect(capacityConfirm(closedFull, 50, 1, none)?.kind).toBe("closed");
    expect(capacityConfirm(closedFull, 50, 1, { closed: true, over: false })?.kind).toBe("over");
    expect(capacityConfirm(closedFull, 50, 1, { closed: true, over: true })).toBeNull();
  });
});

describe("dayRuleError with labels that aren't candles", () => {
  it("reads naturally for 'לפני החג' and 'ערב החג'", () => {
    const before: DayRules = { ...fourth, label: "לפני החג", allowsDelivery: false };
    const eve: DayRules = { ...fourth, label: "ערב החג", allowsPickup: false };
    expect(dayRuleError(before, "delivery")).toBe("לפני החג: יש רק איסוף עצמי.");
    expect(dayRuleError(eve, "pickup")).toBe("ערב החג: אין איסוף עצמי.");
  });
});

describe("bookableDays (no order deadline)", () => {
  const day = (d: string, allowsPickup = true, allowsDelivery = true) => ({ day: d, allowsPickup, allowsDelivery });
  const days = [
    day("2026-12-01"),
    day("2026-12-03"),
    day("2026-12-04", true, false),
    day("2026-12-05", false, false), // Shabbat: no service
    day("2026-12-06"),
  ];

  it("offers today and every later day that has a service", () => {
    expect(bookableDays(days, "2026-12-03").map((d) => d.day)).toEqual(["2026-12-03", "2026-12-04", "2026-12-06"]);
  });

  it("offers the whole season before it starts", () => {
    expect(bookableDays(days, "2026-11-24").map((d) => d.day)).toEqual([
      "2026-12-01",
      "2026-12-03",
      "2026-12-04",
      "2026-12-06",
    ]);
  });

  it("offers nothing after the season", () => {
    expect(bookableDays(days, "2026-12-12")).toEqual([]);
  });

  it("keeps an edited order's own past day", () => {
    expect(bookableDays(days, "2026-12-04", "2026-12-01").map((d) => d.day)).toEqual([
      "2026-12-01",
      "2026-12-04",
      "2026-12-06",
    ]);
  });
});

describe("pastDayError", () => {
  it("allows today and later", () => {
    expect(pastDayError("2026-12-03", "2026-12-03")).toBeNull();
    expect(pastDayError("2026-12-06", "2026-12-03")).toBeNull();
  });

  it("refuses a new order on a day that's over", () => {
    expect(pastDayError("2026-12-01", "2026-12-03")).toBe("היום הזה כבר עבר. צריך לבחור יום אחר.");
  });

  it("lets an edit keep its own past day, but not move to another past day", () => {
    expect(pastDayError("2026-12-01", "2026-12-03", "2026-12-01")).toBeNull();
    expect(pastDayError("2026-12-01", "2026-12-03", "2026-12-02")).not.toBeNull();
  });
});
