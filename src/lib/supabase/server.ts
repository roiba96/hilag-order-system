import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/lib/types";
import { supabaseEnv } from "./env";

// Supabase client for Server Components, Server Actions and Route Handlers.
// Every query runs as the logged-in user, so RLS applies. Create one per request.
export async function createClient() {
  // Supabase reads the clock (token expiry). With Cache Components that must happen per
  // request, never while prerendering: connection() makes everything below request-time.
  await connection();
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. That's fine: src/middleware.ts already
          // refreshed the session for this request.
        }
      },
    },
  });
}
