import { afterEach, describe, expect, it, vi } from "vitest";
import { isAiConfigured } from "./ai-config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAiConfigured", () => {
  it("is off when the key is missing, empty or blank", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);
    expect(isAiConfigured()).toBe(false);
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(isAiConfigured()).toBe(false);
    vi.stubEnv("ANTHROPIC_API_KEY", "   ");
    expect(isAiConfigured()).toBe(false);
  });

  it("is on when a key is set", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-placeholder");
    expect(isAiConfigured()).toBe(true);
  });
});
