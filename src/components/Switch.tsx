"use client";

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** An on/off switch: a real button with role="switch", the whole row is the tap target. */
export function Switch({ label, checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-1 text-start text-lg disabled:opacity-50"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${checked ? "bg-paid" : "bg-ink-muted"}`}
      >
        <span
          className={`absolute top-1 size-6 rounded-full bg-card shadow transition-all ${
            checked ? "start-7" : "start-1"
          }`}
        />
      </span>
    </button>
  );
}
