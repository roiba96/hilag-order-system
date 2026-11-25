import { NextResponse } from "next/server";
import { z } from "zod";
import { SENT_KINDS, recordSent } from "@/lib/record-sent";
import { createClient } from "@/lib/supabase/server";

// POST { orderId, kind }: a WhatsApp button was tapped. Called in the background with
// fetch(keepalive) while the tap itself opens WhatsApp (src/components/WhatsAppLink.tsx).
// JSON only: a cross-site page can't send that without a preflight, which this app refuses.

const Body = z.object({ orderId: z.number().int().positive(), kind: z.enum(SENT_KINDS) });

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "json_only" }, { status: 415 });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const result = await recordSent(supabase, body.data.kind, body.data.orderId, new Date().toISOString());
  if (!result.ok) {
    console.error("whatsapp-sent", body.data.kind, result.code);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
