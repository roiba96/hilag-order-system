import { describe, expect, it } from "vitest";
import { PHONE_ERRORS, formatPhone, normalizePhone, phoneError, telLink } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["052-123-4567"],
    ["0521234567"],
    ["052 123 4567"],
    ["(052) 123-4567"],
    ["+972 52-123-4567"],
    ["+972521234567"],
    ["972521234567"],
    ["00972521234567"],
    ["+972 052 123 4567"],
    ["521234567"],
    [" 052.123.4567 "],
  ])("normalizes %s", (input) => {
    expect(normalizePhone(input)).toBe("972521234567");
  });

  it("works for every mobile prefix 050-059", () => {
    for (let p = 0; p <= 9; p++) {
      expect(normalizePhone(`05${p}-000-1111`)).toBe(`9725${p}0001111`);
    }
  });

  it.each([
    [""],
    ["abc"],
    ["052-123-456"], // too short
    ["052-123-45678"], // too long
    ["03-123-4567"], // landline
    ["+1 212 555 0100"], // not Israeli
    ["972031234567"], // Israeli landline
  ])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("phoneError", () => {
  it("returns Hebrew messages", () => {
    expect(phoneError("")).toBe(PHONE_ERRORS.missing);
    expect(phoneError("   ")).toBe(PHONE_ERRORS.missing);
    expect(phoneError("123")).toBe(PHONE_ERRORS.invalid);
    expect(phoneError("052-123-4567")).toBeNull();
  });
});

describe("formatPhone", () => {
  it("shows the local format", () => {
    expect(formatPhone("972521234567")).toBe("052-123-4567");
    expect(formatPhone("972501112222")).toBe("050-111-2222");
  });

  it("leaves anything else alone", () => {
    expect(formatPhone("0521234567")).toBe("0521234567");
  });

  it("round-trips with normalizePhone", () => {
    expect(normalizePhone(formatPhone("972541234567"))).toBe("972541234567");
  });
});

describe("telLink", () => {
  it("builds an international tel: link", () => {
    expect(telLink("972521234567")).toBe("tel:+972521234567");
  });
});
