"use client";

import { type ReactNode, useEffect, useRef } from "react";

type Props = {
  label: string;
  /** Changes when the selection changes; the selected chip (aria-pressed="true") is centred. */
  selectedKey: string;
  children: ReactNode;
};

/**
 * A horizontally scrolling row of chips that scrolls by itself, never the page. Reaches the
 * screen edges (-mx-4 against the page's px-4) so chips can scroll in from the side.
 */
export function ChipRow({ label, selectedKey, children }: Props) {
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = row.current;
    const chip = container?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!container || !chip) return;
    // Move only this row, by the distance between the chip's centre and the row's centre.
    // Rect-based, so it works the same in RTL.
    const rowBox = container.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    const offset = chipBox.left + chipBox.width / 2 - (rowBox.left + rowBox.width / 2);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    container.scrollBy({ left: offset, behavior: reduceMotion ? "auto" : "smooth" });
  }, [selectedKey]);

  return (
    <div
      ref={row}
      role="group"
      aria-label={label}
      className="-mx-4 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2"
    >
      {children}
    </div>
  );
}
