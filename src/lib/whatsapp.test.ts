import { describe, expect, it } from "vitest";
import { orderSummaryMessage, paymentReminderMessage } from "./messages";
import { MENU_SIZE, box, oneOfEach } from "./test-menu";
import { waLink, waText } from "./whatsapp";

const PHONE = "972521234567";
const BASE = `https://api.whatsapp.com/send?phone=${PHONE}&text=`;

/** Every emoji the baker's messages use. */
const EMOJI = ["🥰", "📅", "🍩", "🎁", "📍", "💰", "❤️", "🕎"];

/** What WhatsApp reads: the text parameter, decoded once, two independent ways. */
function decoded(url: string): { viaURL: string; viaDecode: string } {
  const parsed = new URL(url);
  return {
    viaURL: parsed.searchParams.get("text") ?? "",
    viaDecode: decodeURIComponent(url.slice(BASE.length)),
  };
}

const summary = orderSummaryMessage({
  candle: "נר שלישי",
  day: "2026-12-06",
  fulfillment: "delivery",
  address: "הדקל 5",
  city: "נתניה",
  boxes: [oneOfEach(), box(4, { שוקולד: 2, קינדר: 2 })],
  menuFlavorCount: MENU_SIZE,
  payboxLink: "https://payboxapp.page.link/example?x=1&y=2",
});

describe("waLink", () => {
  it("links straight to api.whatsapp.com/send, never wa.me", () => {
    const url = waLink(PHONE, "היי");
    expect(url.startsWith(BASE)).toBe(true);
    expect(url).not.toContain("wa.me");
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://api.whatsapp.com/send");
    expect(parsed.searchParams.get("phone")).toBe(PHONE);
  });

  it("decodes back to the exact summary message, every emoji included", () => {
    const { viaURL, viaDecode } = decoded(waLink(PHONE, summary));
    expect(viaURL).toBe(summary);
    expect(viaDecode).toBe(summary);
    for (const emoji of EMOJI) expect(viaURL).toContain(emoji);
    for (const kept of ["₪", "״", "×", "·"]) expect(viaURL).toContain(kept);
    expect(viaURL).not.toContain("�");
  });

  it("decodes back to the exact payment reminder", () => {
    const reminder = paymentReminderMessage({
      fullName: "דנה כהן",
      candle: "נר רביעי",
      day: "2026-12-07",
      total: 246,
      payboxLink: "https://payboxapp.page.link/example",
    });
    expect(decoded(waLink(PHONE, reminder)).viaURL).toBe(reminder);
  });

  it("encodes the text exactly once: only safe characters, no double-encoded %25", () => {
    const encoded = waLink(PHONE, summary).slice(BASE.length);
    expect(encoded).toMatch(/^[A-Za-z0-9%\-_.!~*'()]+$/);
    expect(encoded).not.toContain("%25");
  });

  it("encodes each emoji as its full 4-byte UTF-8 sequence", () => {
    expect(waLink(PHONE, "🥰")).toBe(`${BASE}%F0%9F%A5%B0`);
    expect(waLink(PHONE, "🕎")).toBe(`${BASE}%F0%9F%95%8E`);
    expect(waLink(PHONE, "❤️")).toBe(`${BASE}%E2%9D%A4%EF%B8%8F`);
    expect(waLink(PHONE, "₪")).toBe(`${BASE}%E2%82%AA`);
  });

  it("escapes characters that would break the query string", () => {
    expect(waLink(PHONE, "a&b=c #1+2")).toBe(`${BASE}a%26b%3Dc%20%231%2B2`);
  });

  it("refuses a phone that isn't normalized", () => {
    expect(() => waLink("052-123-4567", "x")).toThrow(/normalized/);
  });
});

describe("waText", () => {
  it("normalizes to NFC", () => {
    expect(waText("é")).toBe("é");
  });

  it("turns a lone surrogate into U+FFFD instead of throwing", () => {
    const broken = "abc\uD83E";
    expect(() => encodeURIComponent(broken)).toThrow(URIError);
    expect(waText(broken)).toBe("abc�");
    expect(() => waLink(PHONE, broken)).not.toThrow();
  });

  it("leaves whole emoji untouched", () => {
    expect(waText(EMOJI.join(""))).toBe(EMOJI.join(""));
  });
});
