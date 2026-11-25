"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-11 rounded-xl bg-ink px-5 text-lg font-semibold text-cream"
    >
      הדפסה
    </button>
  );
}
