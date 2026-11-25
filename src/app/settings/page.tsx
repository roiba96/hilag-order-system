import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadDays, loadMenu } from "@/lib/order-data";
import { SettingsView } from "./SettingsView";

export const metadata: Metadata = { title: "הגדרות" };

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6 pb-24">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">הגדרות</h1>
        <Link href="/" className="flex min-h-11 items-center px-2 font-medium underline">
          בית
        </Link>
      </header>
      <Suspense fallback={<p className="text-ink-muted">טוענת הגדרות…</p>}>
        <Settings />
      </Suspense>
    </main>
  );
}

async function Settings() {
  const { supabase } = await requireUser();
  const [days, menu] = await Promise.all([loadDays(supabase), loadMenu(supabase)]);
  return <SettingsView days={days} menu={menu} />;
}
