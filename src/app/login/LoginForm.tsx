"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

const inputClass =
  "min-h-12 w-full rounded-xl border border-line bg-card px-4 text-lg text-ink " +
  "placeholder:text-ink-muted/70 aria-invalid:border-unpaid";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-medium">
          אימייל
        </label>
        <input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.email}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "login-error" : undefined}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-medium">
          סיסמה
        </label>
        <div className="flex gap-2">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            dir="ltr"
            autoComplete="current-password"
            required
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? "login-error" : undefined}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-pressed={showPassword}
            className="min-h-12 shrink-0 rounded-xl border border-line bg-surface px-3 font-medium"
          >
            {showPassword ? "הסתרה" : "הצגה"}
          </button>
        </div>
      </div>

      {hasError && (
        <p
          id="login-error"
          role="alert"
          className="rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl bg-ink px-4 text-lg font-semibold text-cream disabled:opacity-70"
      >
        {pending ? "נכנסת…" : "כניסה"}
      </button>
    </form>
  );
}
