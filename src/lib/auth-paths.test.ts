import { describe, expect, it } from "vitest";
import { isApiPath, isPublicPath, safeNextPath } from "./auth-paths";

describe("isPublicPath", () => {
  it("allows only the login page", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/orders")).toBe(false);
    expect(isPublicPath("/login/extra")).toBe(false);
  });
});

describe("isApiPath", () => {
  it("matches /api and below only", () => {
    expect(isApiPath("/api/parse")).toBe(true);
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/apiary")).toBe(false);
    expect(isApiPath("/orders")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps in-app paths with their query", () => {
    expect(safeNextPath("/orders")).toBe("/orders");
    expect(safeNextPath("/today/print?day=2026-12-07")).toBe("/today/print?day=2026-12-07");
  });

  it("sends missing or unsafe targets home", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("orders")).toBe("/");
  });

  it("never loops back to the login page", () => {
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/login?next=/orders")).toBe("/");
  });
});
