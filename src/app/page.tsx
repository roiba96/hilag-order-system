import Link from "next/link";
import { BUSINESS } from "@/lib/config";
import { logout } from "./login/actions";

// Home: a plain menu until the tab bar with Today and Payments arrives (Phases 2-3).
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold">{BUSINESS.name}</h1>
        <p className="text-ink-muted">ניהול הזמנות</p>
      </header>

      <nav className="flex flex-col gap-3">
        <Link
          href="/orders/new"
          className="flex min-h-14 items-center justify-center rounded-xl bg-ink px-4 text-xl font-semibold text-cream"
        >
          הזמנה חדשה
        </Link>
        <Link
          href="/today"
          className="flex min-h-14 items-center justify-center rounded-xl border border-line bg-card px-4 text-xl font-semibold"
        >
          היום
        </Link>
        <Link
          href="/fry"
          className="flex min-h-14 items-center justify-center rounded-xl border border-line bg-card px-4 text-xl font-semibold"
        >
          טיגון
        </Link>
        <Link
          href="/orders"
          className="flex min-h-14 items-center justify-center rounded-xl border border-line bg-card px-4 text-xl font-semibold"
        >
          הזמנות
        </Link>
        <Link
          href="/payments"
          className="flex min-h-14 items-center justify-center rounded-xl border border-line bg-card px-4 text-xl font-semibold"
        >
          תשלומים
        </Link>
        <Link
          href="/settings"
          className="flex min-h-14 items-center justify-center rounded-xl border border-line bg-card px-4 text-xl font-semibold"
        >
          הגדרות
        </Link>
      </nav>

      <form action={logout} className="mt-auto">
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl border border-line bg-surface px-4 font-medium"
        >
          יציאה
        </button>
      </form>
    </main>
  );
}
