"use client";

import { useEffect } from "react";

type Props = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  /** Milliseconds before it hides itself. */
  duration?: number;
};

/** A short message at the bottom of the screen, with an optional action (e.g. undo). */
export function Toast({ message, actionLabel, onAction, onClose, duration = 8000 }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-cream shadow-lg"
    >
      <span className="font-medium">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="min-h-11 shrink-0 rounded-lg border border-cream/40 px-3 font-semibold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
