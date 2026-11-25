import { describe, expect, it } from "vitest";
import { todayInJerusalem } from "./dates";
import { type FryingRow, defaultDay, fryingForDay } from "./frying";

const rows: FryingRow[] = [
  { day: "2026-12-07", batch: "delivery", flavor: "שוקולד", sortOrder: 3, qty: 10 },
  { day: "2026-12-07", batch: "delivery", flavor: "ריבה קלאסית", sortOrder: 1, qty: 4 },
  { day: "2026-12-07", batch: "pickup", flavor: "הרשיז", sortOrder: 6, qty: 6 },
  { day: "2026-12-06", batch: "pickup", flavor: "שוקולד", sortOrder: 3, qty: 99 },
];
const boxes = [
  { day: "2026-12-07", size: 4, boxes: 2 },
  { day: "2026-12-07", size: 6, boxes: 3 },
  { day: "2026-12-06", size: 6, boxes: 9 },
];

describe("fryingForDay", () => {
  const day = fryingForDay(rows, boxes, "2026-12-07");

  it("splits the day into the delivery and pickup batches, flavors in menu order", () => {
    expect(day.delivery).toEqual({
      batch: "delivery",
      total: 14,
      flavors: [
        { name: "ריבה קלאסית", qty: 4 },
        { name: "שוקולד", qty: 10 },
      ],
    });
    expect(day.pickup).toEqual({ batch: "pickup", total: 6, flavors: [{ name: "הרשיז", qty: 6 }] });
    expect(day.total).toBe(20);
  });

  it("adds both batches per flavor, in menu order", () => {
    const both = fryingForDay(
      [...rows, { day: "2026-12-07", batch: "pickup", flavor: "שוקולד", sortOrder: 3, qty: 5 }],
      boxes,
      "2026-12-07",
    );
    expect(both.flavors).toEqual([
      { name: "ריבה קלאסית", qty: 4 },
      { name: "שוקולד", qty: 15 },
      { name: "הרשיז", qty: 6 },
    ]);
    expect(both.flavors.reduce((sum, f) => sum + f.qty, 0)).toBe(both.total);
  });

  it("counts boxes per size, biggest first, for that day only", () => {
    expect(day.boxes).toEqual([
      { size: 6, count: 3 },
      { size: 4, count: 2 },
    ]);
  });

  it("is empty for a day without orders", () => {
    const empty = fryingForDay(rows, boxes, "2026-12-11");
    expect(empty.total).toBe(0);
    expect(empty.delivery.flavors).toEqual([]);
    expect(empty.boxes).toEqual([]);
  });
});

describe("defaultDay", () => {
  const days = ["2026-12-06", "2026-12-04", "2026-12-07"];

  it("shows today when it's a sale day", () => {
    expect(defaultDay(days, "2026-12-06")).toBe("2026-12-06");
  });

  it("shows the next sale day before or between sale days", () => {
    expect(defaultDay(days, "2026-11-24")).toBe("2026-12-04");
    expect(defaultDay(days, "2026-12-05")).toBe("2026-12-06");
  });

  it("shows the last day after the season", () => {
    expect(defaultDay(days, "2026-12-20")).toBe("2026-12-07");
  });

  it("is null without days", () => {
    expect(defaultDay([], "2026-12-06")).toBeNull();
  });
});

describe("todayInJerusalem", () => {
  it("uses Israel's date, not UTC", () => {
    // 23:30 UTC on 6 Dec is already 01:30 on 7 Dec in Israel (UTC+2 in winter).
    expect(todayInJerusalem(new Date("2026-12-06T23:30:00Z"))).toBe("2026-12-07");
    expect(todayInJerusalem(new Date("2026-12-06T12:00:00Z"))).toBe("2026-12-06");
  });
});

describe("defaultDay with extra days before Hanukkah", () => {
  // The baker added 1.12 and 3.12 on top of 4-11.12: 10 days, not 8, and the season starts earlier.
  const season = ["2026-12-07", "2026-12-01", "2026-12-04", "2026-12-11", "2026-12-03", "2026-12-05", "2026-12-06", "2026-12-08", "2026-12-09", "2026-12-10"];

  it("starts the season on the earliest sale day, whatever the rows' order", () => {
    expect(defaultDay(season, "2026-11-24")).toBe("2026-12-01");
  });

  it("goes from the extra days into Hanukkah", () => {
    expect(defaultDay(season, "2026-12-02")).toBe("2026-12-03");
    expect(defaultDay(season, "2026-12-03")).toBe("2026-12-03");
    expect(defaultDay(season, "2026-12-04")).toBe("2026-12-04");
  });

  it("still ends on the last day", () => {
    expect(defaultDay(season, "2026-12-20")).toBe("2026-12-11");
  });
});
