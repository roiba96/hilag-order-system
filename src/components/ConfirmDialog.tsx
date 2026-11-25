"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  message: string;
  confirmLabel: string;
  /** Stronger styling for risky confirmations (e.g. a closed day). */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** A modal yes/no question built on the native <dialog> (focus trap and Esc for free). */
export function ConfirmDialog({ open, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      aria-labelledby="confirm-message"
      className="m-auto w-[min(92vw,26rem)] rounded-card border border-line bg-card p-5 text-ink backdrop:bg-ink/40"
    >
      <p id="confirm-message" className="whitespace-pre-line text-lg font-semibold">
        {message}
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className={`min-h-12 rounded-xl px-4 text-lg font-semibold ${
            danger ? "bg-unpaid text-card" : "bg-ink text-cream"
          }`}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-xl border border-line bg-surface px-4 font-medium"
        >
          ביטול
        </button>
      </div>
    </dialog>
  );
}
