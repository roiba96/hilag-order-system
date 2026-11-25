import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai-config";
import { createClient } from "@/lib/supabase/server";

// The only place that will call Claude (AI parsing of a pasted WhatsApp message).
// With ANTHROPIC_API_KEY empty it answers 503 "ai_not_configured" and calls nothing;
// the New order screen then shows the manual form only.
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "ai_not_configured", message: "פענוח AI לא מוגדר. אפשר למלא את ההזמנה ידנית." },
      { status: 503 },
    );
  }

  // The parser itself is the next step (prompt, structured output, zod validation, fixtures).
  return NextResponse.json(
    { error: "not_implemented", message: "הפענוח עוד לא מוכן. אפשר למלא ידנית." },
    { status: 501 },
  );
}
