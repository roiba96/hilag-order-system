// The single switch for AI parsing. Server-only: ANTHROPIC_API_KEY never reaches the browser.
//
// With the key empty the app works fully without AI:
// - /api/parse answers 503 { error: "ai_not_configured" } without calling anything (step 8);
// - the New order screen hides "פענוח עם AI" and opens the manual form directly (step 11).
// Turning AI on later = set ANTHROPIC_API_KEY (in .env.local and on Vercel) and restart/redeploy.

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}
