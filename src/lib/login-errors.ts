// Hebrew messages for login failures. Pure, so it's unit-tested.

export type AuthErrorLike = {
  code?: string;
  status?: number;
  name?: string;
};

export const LOGIN_MESSAGES = {
  invalid: "האימייל או הסיסמה לא נכונים.",
  notConfirmed: "המשתמש עוד לא אושר. צריך לאשר אותו ב-Supabase.",
  rateLimit: "יותר מדי ניסיונות. כדאי לחכות דקה ולנסות שוב.",
  network: "אין חיבור לשרת. כדאי לבדוק את האינטרנט ולנסות שוב.",
  config: "החיבור ל-Supabase לא מוגדר נכון. צריך לבדוק את הכתובת והמפתח בהגדרות.",
  unknown: "משהו השתבש בכניסה. כדאי לנסות שוב.",
  missingEmail: "צריך למלא אימייל.",
  badEmail: "האימייל לא נראה תקין.",
  missingPassword: "צריך למלא סיסמה.",
} as const;

export function loginErrorMessage(error: AuthErrorLike): string {
  switch (error.code) {
    case "invalid_credentials":
      return LOGIN_MESSAGES.invalid;
    case "email_not_confirmed":
      return LOGIN_MESSAGES.notConfirmed;
    case "over_request_rate_limit":
      return LOGIN_MESSAGES.rateLimit;
    case "request_timeout":
      return LOGIN_MESSAGES.network;
  }
  if (error.status === 429) return LOGIN_MESSAGES.rateLimit;
  // 401/403/404 from the auth server mean a wrong project URL or key, not a wrong password.
  if (error.status === 401 || error.status === 403 || error.status === 404) {
    return LOGIN_MESSAGES.config;
  }
  // supabase-js reports network failures as AuthRetryableFetchError (status 0 or 5xx).
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return LOGIN_MESSAGES.network;
  }
  if (error.status === 400) return LOGIN_MESSAGES.invalid;
  return LOGIN_MESSAGES.unknown;
}
