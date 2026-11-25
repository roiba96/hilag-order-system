import { describe, expect, it } from "vitest";
import { formatShekels, toShekels } from "./money";

describe("toShekels", () => {
  it("accepts numbers and numeric strings from the DB", () => {
    expect(toShekels(16)).toBe(16);
    expect(toShekels("16.00")).toBe(16);
    expect(toShekels("122")).toBe(122);
    expect(toShekels(0)).toBe(0);
  });

  it("rounds to whole shekels", () => {
    expect(toShekels("21.60")).toBe(22);
    expect(toShekels(21.4)).toBe(21);
  });

  it("refuses values that aren't money", () => {
    expect(() => toShekels("abc")).toThrow(/Not a money value/);
    expect(() => toShekels(Number.NaN)).toThrow();
  });
});

describe("formatShekels", () => {
  it("formats as number then ₪", () => {
    expect(formatShekels(122)).toBe("122 ₪");
    expect(formatShekels(40)).toBe("40 ₪");
    expect(formatShekels(0)).toBe("0 ₪");
  });

  it("groups thousands", () => {
    expect(formatShekels(1220)).toBe("1,220 ₪");
    expect(formatShekels(12345)).toBe("12,345 ₪");
  });
});
