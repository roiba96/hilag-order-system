"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState, useTransition } from "react";
import { firstName } from "@/lib/messages";

type Reopen = { name: string; href: string };

const NOT_RECORDED = "ווצאפ נפתח, אבל הסימון שההודעה נשלחה לא נשמר. כדאי לרענן את הדף ולבדוק.";

/**
 * What every screen with WhatsApp buttons shares:
 * - `refresh` reloads the data, also when the baker comes back from WhatsApp (links, "מחר" and
 *   totals are built on the server, so a page left open must not go stale);
 * - `reopen` is the last message's link, with the customer's name, until she leaves the screen;
 * - `notRecorded` is the error when a send couldn't be recorded.
 */
export function useWhatsAppScreen() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reopen, setReopen] = useState<Reopen | null>(null);
  const [notRecorded, setNotRecorded] = useState<string | null>(null);

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  // Next.js keeps a left page mounted but hidden (React <Activity>): its cleanup runs on leaving
  // the screen, and not when iOS merely switches to WhatsApp, so the link is gone only then.
  useLayoutEffect(
    () => () => {
      setReopen(null);
      setNotRecorded(null);
    },
    [],
  );

  /** Props for a WhatsAppLink of this customer. */
  const linkEvents = (name: string, href: string | null) => ({
    onTap: () => {
      setNotRecorded(null);
      if (href) setReopen({ name, href });
    },
    onSettled: refresh,
    onNotRecorded: () => setNotRecorded(NOT_RECORDED),
  });

  return { refresh, pending, reopen, notRecorded, linkEvents };
}

/** "ווצאפ לא נפתח? פתיחה שוב לדנה": names the customer, so it can't open the wrong chat unnoticed. */
export function ReopenLink({ reopen }: { reopen: Reopen | null }) {
  if (!reopen) return null;
  return (
    <p className="rounded-xl bg-surface px-4 py-3">
      ווצאפ לא נפתח?{" "}
      <a href={reopen.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
        פתיחה שוב ל{firstName(reopen.name)}
      </a>
    </p>
  );
}
