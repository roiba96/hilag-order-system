// Every WhatsApp button must be a real <a> whose api.whatsapp.com URL is there before the tap:
// links are more reliable and don't depend on timing. These render the real screens to
// HTML, the way the server sends them, and check the links in it.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, replace: () => {} }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
// Server actions need a request; the screens only reference them.
vi.mock("@/app/orders/actions", () => ({ cancelOrder: vi.fn(), restoreOrder: vi.fn(), saveOrder: vi.fn() }));
vi.mock("@/app/payments/actions", () => ({ markPaid: vi.fn(), undoPaid: vi.fn() }));
vi.mock("@/app/today/actions", () => ({ markCollected: vi.fn(), undoCollected: vi.fn() }));

import { OrdersList } from "@/app/orders/OrdersList";
import { SavedPanel } from "@/app/orders/new/SavedPanel";
import { PaymentsView } from "@/app/payments/PaymentsView";
import { TodayView } from "@/app/today/TodayView";
import { ReminderQueue } from "@/components/ReminderQueue";
import { ReopenLink } from "@/components/whatsapp-screen";
import type { FormDay, SavedOrder } from "@/lib/order-data";
import { dayReminderLink, linksFor, paymentReminderLink, summaryLink } from "@/lib/order-links";
import { giftOrder, savedOrder } from "@/lib/test-orders";

const LABELS = { "2026-12-07": "נר רביעי" };
const DAY: FormDay = {
  day: "2026-12-07",
  label: "נר רביעי",
  allowsPickup: true,
  allowsDelivery: true,
  isOpen: true,
  maxBoxes: 50,
  booked: 2,
};

type Element = { tag: string; href: string | null; text: string };

/** Every <a> and <button> in the HTML, with its text. */
function controls(html: string): Element[] {
  return [...html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)].map(([, tag, attributes, inner]) => ({
    tag,
    href: /href="([^"]*)"/.exec(attributes)?.[1].replaceAll("&amp;", "&") ?? null,
    text: inner.replace(/<[^>]*>/g, "").trim(),
  }));
}

/** Asserts that every control with this text is an anchor to WhatsApp, and returns them. */
function whatsappAnchors(html: string, text: string): Element[] {
  const found = controls(html).filter((c) => c.text === text);
  expect(found.length).toBeGreaterThan(0);
  for (const control of found) {
    expect(control.tag).toBe("a");
    expect(control.href).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?phone=9725\d{8}&text=.+/);
  }
  return found;
}

const orders = [savedOrder, giftOrder];

describe("WhatsApp buttons are anchors", () => {
  it("Orders list: שליחת סיכום ותשלום, one per unsent order", () => {
    const html = renderToStaticMarkup(
      <OrdersList
        orders={orders}
        days={[DAY]}
        menuFlavorCount={6}
        summaryLinks={linksFor(orders, (o) => summaryLink(o, LABELS, 6, undefined))}
      />,
    );
    expect(whatsappAnchors(html, "שליחת סיכום ותשלום")).toHaveLength(2);
  });

  it("Orders list: an order whose summary was sent has no button", () => {
    const sent: SavedOrder = { ...savedOrder, confirmationSentAt: "2026-11-24T10:00:00Z", payment: "requested" };
    const html = renderToStaticMarkup(<OrdersList orders={[sent]} days={[DAY]} menuFlavorCount={6} summaryLinks={{}} />);
    expect(html).not.toContain("api.whatsapp.com");
    expect(html).toContain("הסיכום נשלח");
  });

  it("saved panel: after both ways of saving, and after an edit", () => {
    const waUrl = summaryLink(savedOrder, LABELS, 6, undefined);
    const base = { status: "saved", orderId: 12, total: 84, customerName: "דנה כהן", returningCustomer: null, waUrl } as const;
    for (const wantsToSend of [true, false]) {
      for (const edited of [true, false]) {
        const html = renderToStaticMarkup(<SavedPanel result={{ ...base, edited }} wantsToSend={wantsToSend} />);
        expect(whatsappAnchors(html, "שליחת סיכום ותשלום בווצאפ")).toHaveLength(1);
      }
    }
  });

  it("Payments: בקשת תשלום and שליחה שוב", () => {
    const asked: SavedOrder = { ...giftOrder, payment: "requested" };
    const list = [savedOrder, asked];
    const html = renderToStaticMarkup(
      <PaymentsView
        orders={list}
        labels={LABELS}
        reminderLinks={linksFor(list, (o) => paymentReminderLink(o, LABELS, undefined))}
      />,
    );
    expect(whatsappAnchors(html, "בקשת תשלום")).toHaveLength(1);
    expect(whatsappAnchors(html, "שליחה שוב")).toHaveLength(1);
  });

  it("Today: תזכורת בווצאפ for deliveries and pickups", () => {
    const html = renderToStaticMarkup(
      <TodayView
        days={[DAY]}
        initialDay={DAY.day}
        reminderDay={DAY}
        orders={orders}
        menuFlavorCount={6}
        fryingRows={[]}
        boxRows={[]}
        reminderLinks={linksFor(orders, (o) => dayReminderLink(o, LABELS, "2026-12-06"))}
      />,
    );
    expect(whatsappAnchors(html, "תזכורת בווצאפ")).toHaveLength(2);
  });

  it("both queues: the send button", () => {
    const item = {
      id: 12,
      name: "דנה כהן",
      phone: "972521234567",
      payment: "unpaid",
      confirmationSentAt: null,
      details: "נר רביעי (7.12)",
      total: 84,
    } as const;
    const queues = [
      { kind: "paymentReminder", waHref: paymentReminderLink(savedOrder, LABELS, undefined) },
      { kind: "dayReminder", waHref: dayReminderLink(savedOrder, LABELS, "2026-12-06") },
    ] as const;
    for (const { kind, waHref } of queues) {
      const html = renderToStaticMarkup(
        <ReminderQueue
          item={{ ...item, waHref }}
          remaining={1}
          kind={kind}
          skipHref="/x"
          backHref="/y"
          sendLabel="שליחת תזכורת"
          doneText="סוף"
          skippedCount={0}
        />,
      );
      expect(whatsappAnchors(html, "שליחת תזכורת")).toHaveLength(1);
    }
  });

  it("a bad saved phone shows a note, not a dead button", () => {
    const html = renderToStaticMarkup(
      <OrdersList orders={[savedOrder]} days={[DAY]} menuFlavorCount={6} summaryLinks={{ 12: null }} />,
    );
    expect(html).toContain("הטלפון לא תקין, אי אפשר לפתוח ווצאפ");
    expect(controls(html).map((c) => c.text)).not.toContain("שליחת סיכום ותשלום");
  });

  it("the reopen link names the customer and is hidden until something was opened", () => {
    const href = summaryLink(savedOrder, LABELS, 6, undefined) ?? "";
    expect(renderToStaticMarkup(<ReopenLink reopen={null} />)).toBe("");
    whatsappAnchors(renderToStaticMarkup(<ReopenLink reopen={{ name: "דנה כהן", href }} />), "פתיחה שוב לדנה");
  });
});

describe("no other way to open WhatsApp", () => {
  const root = join(import.meta.dirname, "..", "src");
  const sources = readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => ({ file, code: readFileSync(join(root, file), "utf8") }));

  it("no window.open or location navigation anywhere", () => {
    const offenders = sources.filter(({ code }) => /window\.open\(|location\.(href|assign|replace)\b/.test(code));
    expect(offenders.map(({ file }) => file)).toEqual([]);
  });

  it("the WhatsApp link component never cancels the tap", () => {
    const link = sources.find(({ file }) => file.endsWith("WhatsAppLink.tsx"));
    expect(link?.code).not.toMatch(/preventDefault\(|await /);
    expect(link?.code).toContain("keepalive: true");
  });
});

describe("Today in the baker's order of work", () => {
  const html = renderToStaticMarkup(
    <TodayView
      days={[DAY]}
      initialDay={DAY.day}
      reminderDay={null}
      orders={orders}
      menuFlavorCount={6}
      fryingRows={[
        { day: DAY.day, batch: "delivery", flavor: "שוקולד", sortOrder: 3, qty: 2 },
        { day: DAY.day, batch: "pickup", flavor: "שוקולד", sortOrder: 3, qty: 2 },
      ]}
      boxRows={[]}
      reminderLinks={{}}
    />,
  );
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

  it("frying totals → batches → boxing → deliveries → pickups", () => {
    const steps = [
      "4 סופגניות",
      "סבב משלוחים · מוכן ב-11:00",
      "סבב איסוף עצמי · מוכן ב-15:00",
      "אריזה",
      "משלוחים · יוצאים ב- 11:00",
      "איסוף עצמי ב עיר הדגמה · בין 15:00 ל-17:30",
    ].map((step) => text.replaceAll(" ", "").indexOf(step.replaceAll(" ", "")));
    expect(steps).not.toContain(-1);
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });

  it("boxing: a row per order with its boxes and flavors, deliveries before pickups", () => {
    const boxing = html.slice(html.indexOf("boxing-title"), html.indexOf("deliveries-title"));
    expect(boxing.indexOf("משלוחים · 11:00")).toBeGreaterThan(-1);
    expect(boxing.indexOf("משלוחים · 11:00")).toBeLessThan(boxing.indexOf("איסוף עצמי · 15:00"));
    expect(boxing.match(/מארז 4 · שוקולד ×2, קינדר ×2/g)).toHaveLength(2);
    expect(boxing).toContain("למסירה ל: ");
  });
});
