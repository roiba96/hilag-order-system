import { describe, expect, it } from "vitest";
import { supabaseOrigin } from "./env";

describe("supabaseOrigin", () => {
  it("keeps a correct project URL as is", () => {
    expect(supabaseOrigin("https://abcd1234.supabase.co")).toBe("https://abcd1234.supabase.co");
  });

  it("strips the REST path and trailing slashes people paste from the dashboard", () => {
    expect(supabaseOrigin("https://abcd1234.supabase.co/rest/v1/")).toBe(
      "https://abcd1234.supabase.co",
    );
    expect(supabaseOrigin("https://abcd1234.supabase.co/")).toBe("https://abcd1234.supabase.co");
    expect(supabaseOrigin("  https://abcd1234.supabase.co  ")).toBe("https://abcd1234.supabase.co");
  });

  it("keeps the port of a local Supabase", () => {
    expect(supabaseOrigin("http://127.0.0.1:54321")).toBe("http://127.0.0.1:54321");
  });

  it("rejects something that isn't a URL", () => {
    expect(() => supabaseOrigin("abcd1234.supabase.co")).toThrow(/not a valid URL/);
  });
});
