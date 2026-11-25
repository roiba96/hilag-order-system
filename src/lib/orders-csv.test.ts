import { describe, expect, it } from "vitest";
import type { SavedOrder } from "./order-data";
import { csvField, csvFileName, ordersCsv } from "./orders-csv";

const base: SavedOrder = {
  id: 12,
  customerName: "דנה כהן",
  customer: { id: 1, fullName: "דנה כהן", phone: "972521234567" },
  day: "2026-12-07",
  fulfillment: "delivery",
  address: "הדקל 5",
  city: "נתניה",
  addressDetails: "קומה 3",
  courierNotes: null,
  recipientName: null,
  recipientPhone: null,
  timeWindow: null,
  notes: null,
  source: "whatsapp",
  status: "new",
  payment: "requested",
  confirmationSentAt: null,
  paymentRequestedAt: null,
  paidAt: null,
  reminderSentAt: null,
  deliveryFee: 40,
  createdAt: "2026-11-23T10:00:00Z",
  boxes: [
    { id: 1, size: 4, items: [{ flavorId: 3, name: "שוקולד", qty: 2, unitPrice: 20 }, { flavorId: 5, name: "קינדר", qty: 2, unitPrice: 22 }] },
  ],
  total: 124,
};

const pickup: SavedOrder = {
  ...base,
  id: 13,
  customerName: 'רונית "רוני" לוי',
  fulfillment: "pickup",
  address: null,
  city: null,
  addressDetails: null,
  payment: "paid",
  status: "cancelled",
  total: 84,
};

const csv = ordersCsv([base, pickup], { "2026-12-07": "נר רביעי" }, 6);

describe("ordersCsv", () => {
  it("starts with a UTF-8 BOM and Hebrew headers", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.slice(1).split("\r\n")[0]).toBe(
      'מספר הזמנה,שם,טלפון,יום,תאריך,איסוף / משלוח,כתובת מלאה,מארזים,"סה""כ (₪)",תשלום,סטטוס',
    );
  });

  it("writes one row per order, delivery with its full address", () => {
    expect(csv.slice(1).split("\r\n")[1]).toBe(
      '12,דנה כהן,052-123-4567,נר רביעי,7.12,משלוח,"הדקל 5, קומה 3, נתניה","מארז 4 · שוקולד ×2, קינדר ×2",124,"נשלח סיכום, ממתין לתשלום",חדשה',
    );
  });

  it("includes cancelled orders and quotes names with quotes", () => {
    expect(csv.slice(1).split("\r\n")[2]).toBe(
      '13,"רונית ""רוני"" לוי",052-123-4567,נר רביעי,7.12,איסוף עצמי,איסוף בעיר הדגמה,"מארז 4 · שוקולד ×2, קינדר ×2",84,שולם,בוטלה',
    );
  });

  it("uses CRLF line endings and ends with one", () => {
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.slice(1, -2).split("\r\n")).toHaveLength(3);
    expect(csv.replace(/\r\n/g, "")).not.toContain("\n");
  });
});

describe("csvField", () => {
  it("leaves plain text and numbers alone", () => {
    expect(csvField("דנה")).toBe("דנה");
    expect(csvField(122)).toBe("122");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("defuses text Excel would run as a formula", () => {
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField("+972")).toBe("'+972");
    expect(csvField("-5")).toBe("'-5");
    expect(csvField("@x")).toBe("'@x");
  });
});

describe("csvFileName", () => {
  it("names the file by date", () => {
    expect(csvFileName("2026-12-01")).toBe("HILAG-orders-2026-12-01.csv");
  });
});
