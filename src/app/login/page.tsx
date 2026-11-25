import type { Metadata } from "next";
import { Suspense } from "react";
import { BUSINESS } from "@/lib/config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "כניסה" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold">{BUSINESS.name}</h1>
        <p className="text-ink-muted">כניסה לניהול ההזמנות</p>
      </header>

      <section className="rounded-card border border-line bg-card p-5">
        {/* The form reads ?next= from the URL, which Cache Components renders per request. */}
        <Suspense fallback={<div className="min-h-64" aria-hidden />}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
