# HILAG: instructions for Claude Code

Order management for a small home bakery. First season: Hanukkah 2026 (donuts only).
One user (the baker), mostly on an iPhone.

## Stack
Next.js 16 (App Router, `src/`, Cache Components on), Tailwind 4, Supabase (Postgres + Auth via
`@supabase/ssr`), `@anthropic-ai/sdk` (server only), zod, Vitest. Deploy: Netlify (free plan,
commercial use allowed) from GitHub; `netlify.toml`. Free plan = 300 credits/month, hard cap, and
each production deploy costs 15: batch changes, push to `main` rarely. Fallback: Vercel Pro.
Ask before adding dependencies.

## Database
- `schema.sql` is the base and is never edited. Changes = numbered files in `supabase/migrations/`
  (`004_...sql`); the developer runs them in the Supabase SQL Editor. Say when one needs running.
- Every migration that creates tables, views or functions includes its grants, **to `authenticated`
  only. Never grant anything to `anon`.** New functions: `revoke all ... from public, anon;` then
  `grant execute ... to authenticated;` (Postgres gives PUBLIC execute by default).
- Keep `src/lib/types.ts` in sync; `schema-sync.test.ts` reads `schema.sql` + migrations.
- RLS stays on; every query runs as the logged-in user. Never use the service role key.

## Next.js 16 specifics
- `src/middleware.ts` refreshes the session and redirects to /login. It is deliberately the
  deprecated middleware.ts (Edge runtime), not proxy.ts: Netlify can't package a Turbopack-built
  Node.js proxy yet (opennextjs-netlify issue 3575). Switch back to proxy.ts once that's fixed.
- Server code that touches data calls `requireUser()` (`src/lib/auth.ts`).
- Cache Components: data pages render their data inside `<Suspense>`. The server Supabase client
  awaits `connection()` first, so the clock (`Date.now()`) is never read while prerendering. Any
  other per-request value (today's date in Asia/Jerusalem, random ids) needs `await connection()`.
- Read `node_modules/next/dist/docs/` before using an API you're unsure of.

## Business rules (decided with the developer)
- The brand is "HILAG", all capitals, everywhere users or customers see it: `BUSINESS.name`, never a
  literal.
- Money: whole shekels; DB numeric → `toShekels()`; display `formatShekels()` inside `<Ltr>`.
- Phones stored as `9725XXXXXXXX` (`normalizePhone`); shown as `052-123-4567`.
- Prices are snapshotted in `box_items.unit_price`; totals are computed on the server only.
- WhatsApp links are `https://api.whatsapp.com/send?phone=…&text=…` built only by `waLink()`
  (NFC, encodeURIComponent once, never sliced). Every WhatsApp button is a real `<a>`
  (`WhatsAppLink`) with its URL built on the server before the tap (`order-links.ts`); never open
  WhatsApp from code (links are more reliable and don't depend on timing; this wasn't a proven
  bug, and the developer may ask for one-tap "save and send" back). The tap is recorded in the background
  (`/api/whatsapp-sent`, keepalive). Saving never sends. Never `wa.me`: its redirect turned every emoji
  into "�" on iPhone + WhatsApp Business. Don't re-encode a link in the browser.
- One WhatsApp message = order summary + PayBox payment request (`src/lib/messages.ts`, the baker's
  exact wording). Sending sets `confirmation_sent_at`, `payment_requested_at`, payment
  `requested` (never downgrades `paid`); status stays `new`. "סמני שולם" sets `paid` + `confirmed`.
- Boxes must be exactly full: form, zod, `validateOrder` and `save_order` (007) all refuse otherwise.
- Messages always go to the customer who ordered, also for gifts (they can ask for payment).
- Pickup is between 15:00 and 17:30 (`PICKUP_WINDOW`); the pickup batch is ready at 15:00.
- Today follows the baker's work: frying totals, batches, boxing, then deliveries and pickups.
- Unpaid orders count toward day capacity. Capacity and closed days are confirmations, not blocks.
- No order deadline: a day takes orders until it's full or closed. New orders (and later the public
  order link) offer only today and later days in Asia/Jerusalem (`bookableDays`); the server refuses
  a past day (`pastDayError`), except an edit keeping its own day. History screens show all days.
- Per-day pickup/delivery switches (`sale_days.allows_*`); a day with both off takes no orders.
- AI parsing is off while `ANTHROPIC_API_KEY` is empty (`isAiConfigured()`); the app must work fully
  without it. Never send anything to Claude but the pasted text and the menu/days context.
- Never log customer data (names, phones, addresses, messages); log error codes only.

## Year-round later
After Hanukkah this becomes a general product system. Don't hardcode "donut", box sizes, the
delivery fee, batch times or the pickup place in UI logic: read them from `src/lib/config.ts`
(later a settings table). The baker's message wording in `messages.ts` is the one place for copy.

## UI
Hebrew, RTL, mobile-first, 44px+ tap targets, real `<button>`/`<label>`/`<input>`. Brand tokens in
`globals.css` (cream/ink/tan, payment status colours); no emoji in the UI (only in WhatsApp texts),
no gradients. WCAG AA contrast.

## Workflow
- One numbered step at a time: `npm run lint`, `npm run build`, `npm test` must pass, then a
  conventional commit. Don't push to `main` before the developer confirms. Stop at the end of each phase.
- PowerShell here; give commands the developer can paste.
