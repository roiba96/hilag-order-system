import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { recordSent } from "./record-sent";
import type { Database } from "./types";

const NOW = "2026-12-01T10:00:00Z";

/** Records each update and its filters; `fail` makes every update return an error. */
function fakeClient(fail = false) {
  const calls: { update: object; filters: string[] }[] = [];
  const client = {
    from: () => ({
      update: (update: object) => {
        const call = { update, filters: [] as string[] };
        calls.push(call);
        const query = {
          eq: (column: string, value: unknown) => (call.filters.push(`${column}=${String(value)}`), query),
          neq: (column: string, value: unknown) => (call.filters.push(`${column}!=${String(value)}`), query),
          then: (resolve: (result: { error: { code: string } | null }) => void) =>
            resolve({ error: fail ? { code: "42501" } : null }),
        };
        return query;
      },
    }),
  };
  return { calls, client: client as unknown as SupabaseClient<Database> };
}

describe("recordSent", () => {
  it("summary: both timestamps, and 'requested' only for an unpaid order", async () => {
    const { client, calls } = fakeClient();
    expect(await recordSent(client, "summary", 7, NOW)).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        update: { confirmation_sent_at: NOW, payment_requested_at: NOW },
        filters: ["id=7", "status!=cancelled"],
      },
      { update: { payment: "requested" }, filters: ["id=7", "status!=cancelled", "payment=unpaid"] },
    ]);
  });

  it("payment reminder: never touches a paid order", async () => {
    const { client, calls } = fakeClient();
    await recordSent(client, "paymentReminder", 7, NOW);
    expect(calls).toEqual([
      {
        update: { payment: "requested", payment_requested_at: NOW },
        filters: ["id=7", "status!=cancelled", "payment!=paid"],
      },
    ]);
  });

  it("day reminder: only the reminder time", async () => {
    const { client, calls } = fakeClient();
    await recordSent(client, "dayReminder", 7, NOW);
    expect(calls).toEqual([{ update: { reminder_sent_at: NOW }, filters: ["id=7", "status!=cancelled"] }]);
  });

  it("reports a failed update", async () => {
    for (const kind of ["summary", "paymentReminder", "dayReminder"] as const) {
      expect(await recordSent(fakeClient(true).client, kind, 7, NOW)).toEqual({ ok: false, code: "42501" });
    }
  });
});
