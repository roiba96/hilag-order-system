import { describe, expect, it } from "vitest";
import {
  type SummaryMessageInput,
  dayReminderMessage,
  firstName,
  orderSummaryMessage,
  paymentReminderMessage,
} from "./messages";
import { MENU_SIZE, box, oneOfEach } from "./test-menu";

const LINK = "https://payboxapp.page.link/example";

const pickupOneBox: SummaryMessageInput = {
  candle: "נר רביעי",
  day: "2026-12-07",
  fulfillment: "pickup",
  address: null,
  city: null,
  boxes: [oneOfEach()],
  menuFlavorCount: MENU_SIZE,
  payboxLink: LINK,
};

const deliveryTwoBoxes: SummaryMessageInput = {
  candle: "נר שלישי",
  day: "2026-12-06",
  fulfillment: "delivery",
  address: "רחוב הדקל 5",
  city: "נתניה",
  boxes: [oneOfEach(), box(4, { שוקולד: 2, קינדר: 2 })],
  menuFlavorCount: MENU_SIZE,
  payboxLink: LINK,
};

describe("orderSummaryMessage", () => {
  it("one box, pickup: the baker's exact text", () => {
    expect(orderSummaryMessage(pickupOneBox)).toBe(
      [
        "היייי! 🥰",
        "איזה כיף שהזמנתם סופגניות לחנוכה מ-HILAG!",
        "",
        "רק עושה סדר בפרטי ההזמנה שלכם:",
        "",
        "📅 תאריך ההזמנה: נר רביעי, יום שני 7.12",
        "🍩 מארז: מארז 6",
        "🎁 טעמים: אחד מכל טעם",
        "📍 איסוף עצמי בעיר הדגמה, בין 15:00 ל-17:30",
        "💰 סה״כ לתשלום: 122 ₪",
        "",
        "כדי להשלים ולשריין את ההזמנה, ניתן להעביר את התשלום מראש דרך PayBox בקישור המצורף:",
        "",
        LINK,
        "",
        "לאחר ביצוע התשלום ההזמנה שלכם סגורה ומאושרת ❤️",
        "",
        "מחכה לפנק אתכם בחנוכה מתוק וטעים!",
        "חג שמח 🕎",
      ].join("\n"),
    );
  });

  it("two boxes, delivery: one line per box, fee and timing shown", () => {
    const text = orderSummaryMessage(deliveryTwoBoxes);
    expect(text).toContain("📅 תאריך ההזמנה: נר שלישי, יום ראשון 6.12");
    expect(text).toContain("🍩 מארז: 2 מארזים (6 + 4)");
    expect(text).toContain(
      "🎁 טעמים:\nמארז 6 · אחד מכל טעם\nמארז 4 · שוקולד ×2, קינדר ×2\n📍",
    );
    expect(text).toContain("📍 משלוח לרחוב הדקל 5, נתניה (40 ₪)\nהמשלוחים יוצאים ב-11:00");
    expect(text).toContain("💰 סה״כ לתשלום: 246 ₪"); // 122 + 84 + 40
  });

  it("pickup: no address, no fee, pickup window", () => {
    const text = orderSummaryMessage(pickupOneBox);
    expect(text).not.toContain("משלוח");
    expect(text).not.toContain("40 ₪");
    expect(text).toContain("📍 איסוף עצמי בעיר הדגמה, בין 15:00 ל-17:30\n💰");
  });

  it("delivery with a custom single box", () => {
    const text = orderSummaryMessage({
      ...deliveryTwoBoxes,
      boxes: [box(4, { "ריבת חלב": 4 })],
    });
    expect(text).toContain("🍩 מארז: מארז 4");
    expect(text).toContain("🎁 טעמים: ריבת חלב ×4");
    expect(text).toContain("💰 סה״כ לתשלום: 112 ₪"); // 72 + 40
  });

  it("no PayBox link: the link line is left out and the sentence still reads well", () => {
    for (const payboxLink of [null, undefined, "", "   "]) {
      const text = orderSummaryMessage({ ...pickupOneBox, payboxLink });
      expect(text).not.toContain("בקישור המצורף");
      expect(text).not.toContain("http");
      expect(text).toContain(
        "ניתן להעביר את התשלום מראש דרך PayBox.\n\nלאחר ביצוע התשלום",
      );
    }
  });

  it("the optional fee and timing lines can be switched off", () => {
    const text = orderSummaryMessage(deliveryTwoBoxes, {
      showDeliveryFee: false,
      showTimingLine: false,
    });
    expect(text).toContain("📍 משלוח לרחוב הדקל 5, נתניה\n💰");
    expect(text).not.toContain("11:00");
    const pickupText = orderSummaryMessage(pickupOneBox, { showDeliveryFee: false, showTimingLine: false });
    expect(pickupText).toContain("📍 איסוף עצמי בעיר הדגמה\n💰");
  });
});

describe("paymentReminderMessage", () => {
  const base = {
    fullName: "דנה כהן",
    candle: "נר רביעי",
    day: "2026-12-07",
    total: 246,
    payboxLink: "https://payboxapp.page.link/example",
  };

  it("the baker's exact text", () => {
    expect(paymentReminderMessage({ ...base, payboxLink: "" })).toBe(
      [
        "היייי דנה! 🥰",
        "רק תזכורת קטנה לגבי הסופגניות מ-HILAG 🍩",
        "",
        "📅 תאריך ההזמנה: נר רביעי, יום שני 7.12",
        "💰 סה״כ לתשלום: 246 ₪",
        "",
        "כדי לשריין את ההזמנה, אפשר להעביר את התשלום דרך PayBox 🙏",
        "אחרי התשלום ההזמנה סגורה ומאושרת ❤️",
        "",
        "תודה וחג שמח! 🕎",
      ].join("\n"),
    );
  });

  it("adds the PayBox link under its line only when there is one", () => {
    expect(paymentReminderMessage(base)).toContain(`PayBox 🙏\n${base.payboxLink}\nאחרי התשלום`);
    for (const payboxLink of [null, undefined, "", "  "]) {
      expect(paymentReminderMessage({ ...base, payboxLink })).not.toContain("http");
    }
  });

  it("copes with an empty name", () => {
    expect(paymentReminderMessage({ ...base, fullName: " " }).startsWith("היייי! 🥰")).toBe(true);
  });

  it("takes the first word as the first name", () => {
    expect(firstName("  מאיה   בן דוד ")).toBe("מאיה");
  });
});

describe("labels of the extra days before Hanukkah", () => {
  const beforeHoliday: SummaryMessageInput = { ...pickupOneBox, candle: "לפני החג", day: "2026-12-01" };
  const holidayEve: SummaryMessageInput = { ...deliveryTwoBoxes, candle: "ערב החג", day: "2026-12-03" };

  it("summary: label, weekday and date read as one natural line", () => {
    expect(orderSummaryMessage(beforeHoliday).split("\n")).toContain("📅 תאריך ההזמנה: לפני החג, יום שלישי 1.12");
    expect(orderSummaryMessage(holidayEve).split("\n")).toContain("📅 תאריך ההזמנה: ערב החג, יום חמישי 3.12");
  });

  it("payment reminder", () => {
    const text = paymentReminderMessage({ fullName: "דנה כהן", candle: "לפני החג", day: "2026-12-01", total: 84, payboxLink: LINK });
    expect(text).toContain("📅 תאריך ההזמנה: לפני החג, יום שלישי 1.12");
  });

  it("day-before reminder", () => {
    const text = dayReminderMessage({
      fullName: "דנה כהן",
      candle: "ערב החג",
      day: "2026-12-03",
      isTomorrow: true,
      fulfillment: "pickup",
      address: "",
      total: 84,
      paid: true,
    });
    expect(text).toContain("📅 ערב החג, יום חמישי 3.12");
  });
});
