import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isApiPath, isPublicPath, LOGIN_PATH } from "@/lib/auth-paths";
import { supabaseEnv } from "@/lib/supabase/env";

// Runs before every page and API request.
//
// WHY middleware.ts AND NOT proxy.ts: Next.js 16 renamed middleware.ts to proxy.ts, but proxy.ts
// always runs on the Node.js runtime, and Netlify's adapter can't package a Turbopack-built
// Node.js proxy yet (open bug: github.com/opennextjs/opennextjs-netlify/issues/3575). The
// deprecated middleware.ts runs on the Edge runtime, which Netlify packages fine; the build
// prints a deprecation warning, which is expected. When that issue is fixed, rename this file
// back to proxy.ts and the function to `proxy` (npx @next/codemod@canary middleware-to-proxy .).
//
// 1. Refreshes the Supabase session cookie so the baker stays logged in.
// 2. Sends anyone not logged in to /login (API routes get 401 instead).
// This is an optimistic check; server code still calls requireUser() before touching data.
export async function middleware(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers)) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // Don't put code between createServerClient and getClaims: it validates and refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!loggedIn && !isPublicPath(pathname)) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirectKeepingCookies(loginUrl, response);
  }

  if (loggedIn && pathname === LOGIN_PATH) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return redirectKeepingCookies(homeUrl, response);
  }

  return response;
}

// A redirect must carry any refreshed session cookies, or the session drops.
function redirectKeepingCookies(to: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(to);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  // Skip Next.js internals and public files the phone needs before login
  // (home-screen icon, manifest, robots.txt).
  matcher: [
    "/((?!_next/static|_next/image|icons/|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest|robots\\.txt|favicon\\.ico).*)",
  ],
};
