import { describe, expect, it } from "vitest";
import {
  type DaySettings,
  SETTINGS_ERRORS,
  namesList,
  normalizeDay,
  parseWholeNumber,
  serviceOffWarnings,
} from "./day-settings";

const both: DaySettings = { isOpen: true, allowsPickup: true, allowsDelivery: true, maxBoxes: 50 };

describe("normalizeDay", () => {
  it("keeps a normal change as is", () => {
    const next = { ...both, maxBoxes: 40, allowsDelivery: false };
    expect(normalizeDay(next, both)).toEqual({ ok: true, settings: next, closedForNoService: false });
  });

  it("saves a day with both services off as closed", () => {
    const next = { ...both, allowsPickup: false, allowsDelivery: false };
    expect(normalizeDay(next, both)).toEqual({
      ok: true,
      settings: { ...next, isOpen: false },
      closedForNoService: true,
    });
  });

  it("refuses to open a day that has no service", () => {
    const closedNoService = { isOpen: false, allowsPickup: false, allowsDelivery: false, maxBoxes: 0 };
    expect(normalizeDay({ ...closedNoService, isOpen: true }, closedNoService)).toEqual({
      ok: false,
      error: SETTINGS_ERRORS.openWithoutService,
    });
  });

  it("lets a closed day stay closed with both services off", () => {
    const closedNoService = { isOpen: false, allowsPickup: false, allowsDelivery: false, maxBoxes: 0 };
    expect(normalizeDay(closedNoService, closedNoService).ok).toBe(true);
  });
});

describe("serviceOffWarnings", () => {
  const orders = { pickup: ["רונית"], delivery: ["דנה", "מאיה", "שירה"] };

  it("warns, with names, when delivery is turned off on a day with delivery orders", () => {
    expect(serviceOffWarnings(both, { ...both, allowsDelivery: false }, orders)).toEqual([
      "יש 3 הזמנות משלוח ביום הזה: דנה, מאיה, שירה",
    ]);
  });

  it("uses the singular for one order", () => {
    expect(serviceOffWarnings(both, { ...both, allowsPickup: false }, orders)).toEqual([
      "יש הזמנת איסוף עצמי אחת ביום הזה: רונית",
    ]);
  });

  it("warns about both when both go off", () => {
    expect(serviceOffWarnings(both, { ...both, allowsPickup: false, allowsDelivery: false }, orders)).toHaveLength(2);
  });

  it("stays quiet when nothing is turned off or there are no such orders", () => {
    expect(serviceOffWarnings(both, { ...both, maxBoxes: 10 }, orders)).toEqual([]);
    expect(serviceOffWarnings(both, { ...both, allowsDelivery: false }, { pickup: [], delivery: [] })).toEqual([]);
  });
});

describe("namesList", () => {
  it("lists up to five names, then counts the rest", () => {
    expect(namesList(["א", "ב"])).toBe("א, ב");
    expect(namesList(["א", "ב", "ג", "ד", "ה", "ו", "ז"])).toBe("א, ב, ג, ד, ה ועוד 2");
  });
});

describe("parseWholeNumber", () => {
  it("accepts whole numbers", () => {
    expect(parseWholeNumber("50")).toBe(50);
    expect(parseWholeNumber(" 0 ")).toBe(0);
  });

  it("rejects anything else", () => {
    for (const bad of ["", "-1", "2.5", "abc", "1e3", "123456"]) expect(parseWholeNumber(bad)).toBeNull();
  });
});
