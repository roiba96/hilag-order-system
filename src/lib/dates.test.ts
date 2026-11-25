import { describe, expect, it } from "vitest";
import { dayText, hebrewWeekday, isTomorrow, shortDate } from "./dates";

describe("dates", () => {
  it("knows the Hanukkah 2026 weekdays from the spec", () => {
    expect(hebrewWeekday("2026-12-04")).toBe("יום שישי");
    expect(hebrewWeekday("2026-12-05")).toBe("שבת");
    expect(hebrewWeekday("2026-12-06")).toBe("יום ראשון");
    expect(hebrewWeekday("2026-12-07")).toBe("יום שני");
    expect(hebrewWeekday("2026-12-11")).toBe("יום שישי");
  });

  it("formats short dates without leading zeros", () => {
    expect(shortDate("2026-12-07")).toBe("7.12");
    expect(shortDate("2026-01-05")).toBe("5.1");
  });

  it("combines weekday and date", () => {
    expect(dayText("2026-12-07")).toBe("יום שני 7.12");
  });

  it("rejects malformed dates", () => {
    expect(() => shortDate("7.12")).toThrow();
  });
});

describe("isTomorrow", () => {
  it("knows the next calendar day, across month ends", () => {
    expect(isTomorrow("2026-12-06", "2026-12-07")).toBe(true);
    expect(isTomorrow("2026-11-30", "2026-12-01")).toBe(true);
    expect(isTomorrow("2026-12-06", "2026-12-08")).toBe(false);
    expect(isTomorrow("2026-12-07", "2026-12-07")).toBe(false);
  });
});
