import type { ReactNode } from "react";

/**
 * Left-to-right island inside Hebrew text, for phone numbers and prices
 * ("052-123-4567", "122 ₪"). bdi isolates it from the surrounding RTL text,
 * and nowrap keeps it on one line.
 */
export function Ltr({ children }: { children: ReactNode }) {
  return (
    <bdi dir="ltr" className="whitespace-nowrap">
      {children}
    </bdi>
  );
}
