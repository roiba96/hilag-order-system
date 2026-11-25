import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { todayInJerusalem } from "@/lib/dates";
import { loadDays, loadMenu } from "@/lib/order-data";
import { bookableDays } from "@/lib/order-input";
import { FreshOrderForm } from "./OrderForm";

export const metadata: Metadata = { title: "הזמנה חדשה" };

export default function NewOrderPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">הזמנה חדשה</h1>
        <Link href="/" className="flex min-h-11 items-center px-2 font-medium underline">
          חזרה
        </Link>
      </header>
      {/* Menu and days are read per request (login + live bookings), so they stream in. */}
      <Suspense fallback={<p className="text-ink-muted">טוענת את התפריט והימים…</p>}>
        <NewOrder />
      </Suspense>
    </main>
  );
}

async function NewOrder() {
  const { supabase } = await requireUser();
  const [menu, days] = await Promise.all([loadMenu(supabase), loadDays(supabase)]);

  // AI parsing (paste a WhatsApp message) is added here when ANTHROPIC_API_KEY is set
  // (isAiConfigured()); without it the screen is the manual form only.
  return (
    <FreshOrderForm
      menu={menu.filter((flavor) => flavor.isActive)}
      // No order deadline: today and later days with a service. Past days are history.
      // After requireUser, so the clock is read per request (Cache Components).
      days={bookableDays(days, todayInJerusalem(new Date()))}
    />
  );
}
