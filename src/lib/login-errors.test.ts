import { describe, expect, it } from "vitest";
import { LOGIN_MESSAGES, loginErrorMessage } from "./login-errors";

describe("loginErrorMessage", () => {
  it("maps Supabase error codes", () => {
    expect(loginErrorMessage({ code: "invalid_credentials", status: 400 })).toBe(
      LOGIN_MESSAGES.invalid,
    );
    expect(loginErrorMessage({ code: "email_not_confirmed", status: 400 })).toBe(
      LOGIN_MESSAGES.notConfirmed,
    );
    expect(loginErrorMessage({ code: "over_request_rate_limit", status: 429 })).toBe(
      LOGIN_MESSAGES.rateLimit,
    );
  });

  it("falls back on the HTTP status when there's no code", () => {
    expect(loginErrorMessage({ status: 429 })).toBe(LOGIN_MESSAGES.rateLimit);
    expect(loginErrorMessage({ status: 400 })).toBe(LOGIN_MESSAGES.invalid);
  });

  it("reports a wrong project URL or key as a configuration problem", () => {
    expect(loginErrorMessage({ name: "AuthApiError", status: 404 })).toBe(LOGIN_MESSAGES.config);
    expect(loginErrorMessage({ status: 401 })).toBe(LOGIN_MESSAGES.config);
  });

  it("treats fetch failures as a network problem", () => {
    expect(loginErrorMessage({ name: "AuthRetryableFetchError", status: 0 })).toBe(
      LOGIN_MESSAGES.network,
    );
    expect(loginErrorMessage({ status: 0 })).toBe(LOGIN_MESSAGES.network);
  });

  it("never shows English or raw errors", () => {
    expect(loginErrorMessage({ code: "something_new", status: 500 })).toBe(LOGIN_MESSAGES.unknown);
    expect(loginErrorMessage({})).toBe(LOGIN_MESSAGES.unknown);
  });
});
