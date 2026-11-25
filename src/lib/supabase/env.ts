// Public Supabase settings, safe for the browser (RLS protects the data).
// NEXT_PUBLIC_* values are inlined at build time, so they must be read by their literal names.
export function supabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env.local and fill them in.",
    );
  }
  return { url: supabaseOrigin(url), key: key.trim() };
}

/**
 * The project URL is just the origin (https://<ref>.supabase.co). The dashboard also
 * shows the REST address (.../rest/v1/); pasting that breaks auth with a 404, because the
 * client appends /auth/v1 itself. Keep only the origin.
 */
export function supabaseOrigin(raw: string): string {
  const trimmed = raw.trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL (expected https://<ref>.supabase.co).`);
  }
}
