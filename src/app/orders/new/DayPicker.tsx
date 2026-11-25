"use client";

import { ChipRow } from "@/components/ChipRow";
import { Ltr } from "@/components/Ltr";
import { hebrewWeekday, shortDate } from "@/lib/dates";
import type { FormDay } from "@/lib/order-data";

type Props = {
  days: FormDay[];
  selected: string;
  onSelect: (day: string) => void;
  error?: string;
};

/** Horizontal chips: candle, weekday + date, booked/max. Closed and full days look different. */
export function DayPicker({ days, selected, onSelect, error }: Props) {
  return (
    <fieldset aria-describedby={error ? "day-error" : undefined} className="min-w-0">
      <legend className="mb-2 font-semibold">יום</legend>
      <ChipRow label="בחירת יום" selectedKey={selected}>
        {days.map((day) => {
          const isSelected = day.day === selected;
          const full = day.booked >= day.maxBoxes;
          return (
            <button
              key={day.day}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(day.day)}
              className={[
                "flex min-h-11 min-w-28 shrink-0 snap-start flex-col items-start rounded-xl border px-3 py-2 text-start",
                isSelected
                  ? "border-ink bg-ink text-cream"
                  : day.isOpen
                    ? "border-line bg-card"
                    : "border-dashed border-ink-muted bg-surface text-ink-muted",
              ].join(" ")}
            >
              <span className="font-semibold">{day.label}</span>
              <span className="text-sm">
                {hebrewWeekday(day.day)} {shortDate(day.day)}
              </span>
              <span
                className={`text-sm ${full && !isSelected ? "font-semibold text-unpaid" : ""}`}
              >
                <Ltr>
                  {day.booked}/{day.maxBoxes}
                </Ltr>{" "}
                {!day.isOpen ? "· סגור" : full ? "· מלא" : ""}
              </span>
            </button>
          );
        })}
      </ChipRow>
      {error && (
        <p id="day-error" role="alert" className="mt-1 font-medium text-unpaid">
          {error}
        </p>
      )}
    </fieldset>
  );
}
