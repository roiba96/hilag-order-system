import { redirect } from "next/navigation";
import { LOGIN_PATH } from "./auth-paths";
import { createClient } from "./supabase/server";

/**
 * The real login check for server code. src/middleware.ts only redirects optimistically,
 * so every Server Component, Server Action and Route Handler that touches data
 * calls this first. Returns a Supabase client that runs as the logged-in user.
 *
 * With Cache Components on, a page that calls this must render it inside <Suspense>;
 * the client waits for the request (connection()), so nothing here is prerendered.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect(LOGIN_PATH);
  return { supabase, userId };
}
