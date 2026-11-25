import { describe, expect, it } from "vitest";
import { dayReminderLink, linksFor, paymentReminderLink, summaryLink } from "./order-links";
import { giftOrder, savedOrder } from "./test-orders";

const LABELS = { "2026-12-07": "נר רביעי" };

function read(url: string | null) {
  if (!url) throw new Error("no link");
  const parsed = new URL(url);
  return {
    base: parsed.origin + parsed.pathname,
    to: parsed.searchParams.get("phone"),
    text: parsed.searchParams.get("text") ?? "",
  };
}

describe("order links", () => {
  it("all go to api.whatsapp.com with the order's own name, not the customer's latest", () => {
    const links = [
      summaryLink(savedOrder, LABELS, 6, undefined),
      paymentReminderLink(savedOrder, LABELS, undefined),
      dayReminderLink(savedOrder, LABELS, "2026-12-06"),
    ];
    for (const link of links) {
      expect(read(link).base).toBe("https://api.whatsapp.com/send");
      expect(read(link).to).toBe("972521234567");
      expect(read(link).text).not.toContain("מישהי");
      expect(read(link).text).not.toContain("�");
    }
  });

  it("payment reminder: the order's own name, day and total, every emoji intact", () => {
    const { text } = read(paymentReminderLink(savedOrder, LABELS, undefined));
    expect(text).toContain("היייי דנה! 🥰");
    expect(text).toContain("📅 תאריך ההזמנה: נר רביעי, יום שני 7.12");
    expect(text).toContain("💰 סה״כ לתשלום: 84 ₪");
    for (const emoji of ["🥰", "🍩", "📅", "💰", "🙏", "❤️", "🕎"]) expect(text).toContain(emoji);
  });

  it("day-before: paid and unpaid, pickup and delivery", () => {
    const unpaid = read(dayReminderLink(savedOrder, LABELS, "2026-12-06")).text;
    expect(unpaid).toContain("💰 נשאר לתשלום 84 ₪ דרך PayBox");
    expect(unpaid).toContain("📍 איסוף עצמי בעיר הדגמה, בין 15:00 ל-17:30");
    const paid = read(dayReminderLink({ ...savedOrder, payment: "paid" }, LABELS, "2026-12-06")).text;
    expect(paid).not.toContain("נשאר לתשלום");
    const delivery = read(dayReminderLink(giftOrder, LABELS, "2026-12-06")).text;
    expect(delivery).toContain("🚚 המשלוח יוצא מ-11:00 לכתובת: הדקל 5, קומה 3, נתניה");
  });

  it("says 'tomorrow' only the day before", () => {
    expect(read(dayReminderLink(savedOrder, LABELS, "2026-12-06")).text).toContain("מחר זה קורה!");
    expect(read(dayReminderLink(savedOrder, LABELS, "2026-12-07")).text).not.toContain("מחר");
    expect(read(dayReminderLink(savedOrder, LABELS, "2026-12-01")).text).not.toContain("מחר");
  });

  it("gift: every message goes to the customer who ordered, never to the recipient", () => {
    for (const payment of ["unpaid", "requested", "paid"] as const) {
      const gift = { ...giftOrder, payment };
      const payLink = paymentReminderLink(gift, LABELS, undefined);
      const dayLink = dayReminderLink(gift, LABELS, "2026-12-06");
      for (const link of [summaryLink(gift, LABELS, 6, undefined), payLink, dayLink]) {
        expect(read(link).to).toBe("972521234567");
        expect(read(link).text).not.toContain("רינה");
      }
      expect(read(payLink).text).toContain("היייי דנה!");
      expect(read(dayLink).text).toContain("היייי דנה!");
      expect(read(dayLink).text.includes("נשאר לתשלום 124 ₪")).toBe(payment !== "paid");
    }
  });

  it("a bad saved phone gives no link instead of breaking the page", () => {
    const bad = { ...savedOrder, id: 99, customer: { ...savedOrder.customer, phone: "not a phone" } };
    expect(linksFor([savedOrder, bad], (o) => paymentReminderLink(o, LABELS, undefined))).toEqual({
      12: expect.stringContaining("https://api.whatsapp.com/send?phone=972521234567"),
      99: null,
    });
  });
});
