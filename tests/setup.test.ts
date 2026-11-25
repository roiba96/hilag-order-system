import { describe, expect, it } from "vitest";

// Smoke test: proves Vitest runs and the "@/" alias resolves. Real tests arrive with src/lib.
describe("test setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
