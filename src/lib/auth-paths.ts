// Routing rules for the login guard (src/middleware.ts). Pure, so they're unit-tested.

export const LOGIN_PATH = "/login";

/** Pages anyone can open without logging in. Static files never reach the guard (see matcher). */
export function isPublicPath(pathname: string): boolean {
  return pathname === LOGIN_PATH;
}

/** API routes answer 401 JSON instead of redirecting to the login page. */
export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

/**
 * Where to go after login: the page she originally asked for, if it's a safe
 * in-app path. Anything else (external URLs, "//evil.com", the login page) goes home.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  if (next === LOGIN_PATH || next.startsWith(`${LOGIN_PATH}?`)) return "/";
  return next;
}
