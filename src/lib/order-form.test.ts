import { describe, expect, it } from "vitest";
import type { FormDay, MenuFlavor } from "./order-data";
import {
  type WarningInput,
  boxProblems,
  draftToPriced,
  formWarnings,
  oneOfEachQty,
  savedOrderValues,
} from "./order-form";
import { box, oneOfEach } from "./test-menu";

const menu: MenuFlavor[] = [
  { id: 1, name: "ריבה קלאסית", price: 16, sortOrder: 1, isActive: true },
  { id: 3, name: "שוקולד", price: 20, sortOrder: 3, isActive: true },
  { id: 9, name: "טעם ישן", price: 30, sortOrder: 9, isActive: false },
];

const fourth: FormDay = {
  day: "2026-12-07",
  label: "נר רביעי",
  allowsPickup: true,
  allowsDelivery: true,
  isOpen: true,
  maxBoxes: 50,
  booked: 10,
};

const complete: WarningInput = {
  fullName: "דנה",
  phone: "052-123-4567",
  fulfillment: "pickup",
  address: "",
  city: "",
  day: fourth,
  boxes: [oneOfEach()],
};

describe("draftToPriced", () => {
  it("keeps chosen flavors in menu order with current prices", () => {
    expect(draftToPriced({ key: "a", size: 4, qty: { 3: 2, 1: 2 } }, menu)).toEqual({
      size: 4,
      items: [
        { flavorId: 1, name: "ריבה קלאסית", qty: 2, unitPrice: 16 },
        { flavorId: 3, name: "שוקולד", qty: 2, unitPrice: 20 },
      ],
    });
  });
});

describe("oneOfEachQty", () => {
  it("picks one of every active flavor", () => {
    expect(oneOfEachQty(menu)).toEqual({ 1: 1, 3: 1 });
  });
});

describe("savedOrderValues", () => {
  it("fills the form from a saved order, phones in local format", () => {
    const values = savedOrderValues({
      id: 5,
      day: "2026-12-06",
      fulfillment: "delivery",
      address: "הדקל 5",
      city: "נתניה",
      addressDetails: null,
      courierNotes: "קוד 1234",
      recipientName: null,
      recipientPhone: "972541112222",
      timeWindow: null,
      notes: null,
      source: "instagram",
      status: "new",
      payment: "requested",
      confirmationSentAt: "2026-11-23T10:00:00Z",
      paymentRequestedAt: "2026-11-23T10:00:00Z",
      paidAt: null,
      reminderSentAt: null,
      deliveryFee: 40,
      createdAt: "2026-11-23T10:00:00Z",
      customerName: "דנה",
      customer: { id: 1, fullName: "דנה לוי", phone: "972521234567" },
      boxes: [{ id: 9, size: 4, items: [{ flavorId: 3, name: "שוקולד", qty: 4, unitPrice: 20 }] }],
      total: 120,
    });
    expect(values).toMatchObject({
      fullName: "דנה",
      phone: "052-123-4567",
      recipientPhone: "054-111-2222",
      addressDetails: "",
      courierNotes: "קוד 1234",
      source: "instagram",
      boxes: [{ key: "saved-9", boxId: 9, size: 4, qty: { 3: 4 } }],
    });
  });
});

describe("boxProblems (block saving)", () => {
  it("names every box that isn't full", () => {
    expect(boxProblems([oneOfEach(), box(4, { שוקולד: 3 }), box(6, {})])).toEqual([
      "מארז 2: נבחרו 3 מתוך 4",
      "מארז 3: נבחרו 0 מתוך 6",
    ]);
    expect(boxProblems([oneOfEach(), box(4, { שוקולד: 4 })])).toEqual([]);
  });
});

describe("formWarnings", () => {
  it("is empty for a complete order", () => {
    expect(formWarnings(complete)).toEqual([]);
  });

  it("lists missing details", () => {
    expect(
      formWarnings({ ...complete, fullName: "", phone: "", day: undefined, fulfillment: "delivery" }),
    ).toEqual(["חסר שם", "חסר טלפון", "עוד לא נבחר יום", "חסרה כתובת למשלוח", "חסרה עיר למשלוח"]);
    expect(formWarnings({ ...complete, phone: "123" })).toEqual(["הטלפון לא תקין"]);
  });

  it("flags boxes that aren't full", () => {
    expect(formWarnings({ ...complete, boxes: [oneOfEach(), box(4, { שוקולד: 3 })] })).toEqual([
      "מארז 2: נבחרו 3 מתוך 4",
    ]);
  });

  it("flags a closed day and going over capacity", () => {
    expect(
      formWarnings({ ...complete, day: { ...fourth, isOpen: false, booked: 50 } }),
    ).toEqual(["נר רביעי סגור להזמנות חדשות", "נר רביעי יעבור את התקרה במארז אחד"]);
  });
});
