"use client";

import type { ReactNode } from "react";
import type { SentKind } from "@/lib/record-sent";

type Props = {
  /** Built on the server before the tap (order-links.ts). null = no usable phone. */
  href: string | null;
  orderId: number;
  kind: SentKind;
  className: string;
  children: ReactNode;
  /** The tap happened; WhatsApp is opening. */
  onTap?: () => void;
  /** The server answered, or the answer got lost on the way: time to reload the data. */
  onSettled: () => void;
  /** WhatsApp opened, but the server refused to record it. */
  onNotRecorded: () => void;
};

/**
 * Every WhatsApp button: a real <a>, so the tap itself opens WhatsApp. Links are more reliable
 * than opening it from code and don't depend on timing. The send is recorded in the background:
 * keepalive lets the request finish even if iOS switches to WhatsApp right away. Never call
 * preventDefault here.
 */
export function WhatsAppLink({
  href,
  orderId,
  kind,
  className,
  children,
  onTap,
  onSettled,
  onNotRecorded,
}: Props) {
  if (!href) {
    return <span className="text-sm font-medium text-unpaid">הטלפון לא תקין, אי אפשר לפתוח ווצאפ</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center text-center ${className}`}
      onClick={() => {
        onTap?.();
        void fetch("/api/whatsapp-sent", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, kind }),
        })
          .then((response) => {
            if (!response.ok) onNotRecorded();
          })
          // A lost answer isn't a lost record: reloading the data shows which one it was.
          .catch(() => undefined)
          .finally(onSettled);
      }}
    >
      {children}
    </a>
  );
}
