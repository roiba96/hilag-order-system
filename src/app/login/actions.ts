"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth-paths";
import { LOGIN_MESSAGES, loginErrorMessage } from "@/lib/login-errors";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
  email: string; // kept so a failed attempt doesn't clear what she typed
};

const LoginInput = z.object({
  email: z.string().trim().min(1, LOGIN_MESSAGES.missingEmail).pipe(z.email(LOGIN_MESSAGES.badEmail)),
  password: z.string().min(1, LOGIN_MESSAGES.missingPassword),
  next: z.string().optional(),
});

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? ""),
  };

  const parsed = LoginInput.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? LOGIN_MESSAGES.unknown, email: raw.email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // Never log the email or password; the error code is enough to debug.
    console.warn("login failed", { code: error.code, status: error.status, name: error.name });
    return { error: loginErrorMessage(error), email: parsed.data.email };
  }

  // redirect() throws, so it must stay outside any try/catch.
  redirect(safeNextPath(parsed.data.next));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
