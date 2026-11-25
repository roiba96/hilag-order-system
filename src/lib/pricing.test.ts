import { describe, expect, it } from "vitest";
import {
  boxDonuts,
  boxIsFull,
  boxPrice,
  boxesSummary,
  describeBox,
  deliveryFee,
  isOneOfEach,
  orderDonuts,
  orderTotal,
} from "./pricing";
import { MENU_SIZE, box, oneOfEach } from "./test-menu";

describe("box math", () => {
  it("prices one of each flavor at 122 ₪ (spec)", () => {
    expect(boxPrice(oneOfEach())).toBe(122);
    expect(boxDonuts(oneOfEach())).toBe(6);
    expect(boxIsFull(oneOfEach())).toBe(true);
  });

  it("prices a custom 4-box as the sum of its donuts", () => {
    const b = box(4, { שוקולד: 2, קינדר: 2 });
    expect(boxPrice(b)).toBe(2 * 20 + 2 * 22);
    expect(boxIsFull(b)).toBe(true);
  });

  it("allows all of one flavor", () => {
    expect(boxPrice(box(6, { הרשיז: 6 }))).toBe(144);
  });

  it("knows when a box isn't full", () => {
    expect(boxIsFull(box(6, { שוקולד: 4 }))).toBe(false);
    expect(boxIsFull(box(4, {}))).toBe(false);
  });
});

describe("order totals", () => {
  const boxes = [oneOfEach(), box(4, { שוקולד: 2, קינדר: 2 })];

  it("adds the 40 ₪ delivery fee once per order", () => {
    expect(deliveryFee("delivery")).toBe(40);
    expect(orderTotal(boxes, "delivery")).toBe(122 + 84 + 40);
  });

  it("charges nothing for pickup", () => {
    expect(deliveryFee("pickup")).toBe(0);
    expect(orderTotal(boxes, "pickup")).toBe(206);
  });

  it("counts donuts across boxes", () => {
    expect(orderDonuts(boxes)).toBe(10);
  });
});

describe("describeBox", () => {
  it("recognizes one of each flavor", () => {
    expect(isOneOfEach(oneOfEach(), MENU_SIZE)).toBe(true);
    expect(describeBox(oneOfEach(), MENU_SIZE)).toBe("מארז 6 · אחד מכל טעם");
  });

  it("lists custom flavors in menu order with counts", () => {
    expect(describeBox(box(4, { קינדר: 2, שוקולד: 2 }), MENU_SIZE)).toBe(
      "מארז 4 · שוקולד ×2, קינדר ×2",
    );
    expect(describeBox(box(6, { "ריבה קלאסית": 1, הרשיז: 5 }), MENU_SIZE)).toBe(
      "מארז 6 · ריבה קלאסית ×1, הרשיז ×5",
    );
  });

  it("doesn't call a partial box one of each", () => {
    const fiveFlavors = box(6, { "ריבה קלאסית": 1, "ריבת חלב": 1, שוקולד: 1, סינבון: 1, קינדר: 2 });
    expect(isOneOfEach(fiveFlavors, MENU_SIZE)).toBe(false);
  });

  it("says when no flavors were chosen", () => {
    expect(describeBox(box(4, {}), MENU_SIZE)).toBe("מארז 4 · עוד לא נבחרו טעמים");
  });
});

describe("boxesSummary", () => {
  it("names a single box by size", () => {
    expect(boxesSummary([oneOfEach()])).toBe("מארז 6");
  });

  it("counts several boxes and lists their sizes", () => {
    expect(boxesSummary([oneOfEach(), box(4, { שוקולד: 4 })])).toBe("2 מארזים (6 + 4)");
  });
});
