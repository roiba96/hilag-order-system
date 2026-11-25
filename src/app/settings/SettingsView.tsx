"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Ltr } from "@/components/Ltr";
import { Switch } from "@/components/Switch";
import { Toast } from "@/components/Toast";
import { hebrewWeekday, shortDate } from "@/lib/dates";
import { SETTINGS_ERRORS, parseWholeNumber } from "@/lib/day-settings";
import { formatShekels } from "@/lib/money";
import type { FormDay, MenuFlavor } from "@/lib/order-data";
import { updateDay, updateFlavor } from "./actions";

type Props = { days: FormDay[]; menu: MenuFlavor[] };

const numberInput =
  "min-h-12 w-24 rounded-xl border border-line bg-card px-3 text-center text-lg aria-invalid:border-unpaid";
const saveButton = "min-h-12 rounded-xl bg-ink px-5 text-lg font-semibold text-cream disabled:opacity-50";

export function SettingsView({ days, menu }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="days-title" className="flex flex-col gap-3">
        <h2 id="days-title" className="text-xl font-semibold">
          ימים
        </h2>
        {days.map((day) => (
          // Keyed on the saved values: after a save + refresh the card starts from what's stored.
          <DayCard key={`${day.day}-${day.isOpen}-${day.allowsPickup}-${day.allowsDelivery}-${day.maxBoxes}`} day={day} onSaved={setToast} />
        ))}
      </section>

      <section aria-labelledby="flavors-title" className="flex flex-col gap-3">
        <h2 id="flavors-title" className="text-xl font-semibold">
          טעמים ומחירים
        </h2>
        <p className="text-ink-muted">שינוי מחיר חל רק על מארזים שנשמרים מעכשיו. הזמנות קיימות שומרות את המחיר שלהן.</p>
        <div className="rounded-card border border-line bg-card px-4">
          <ul className="divide-y divide-line">
            {menu.map((flavor) => (
              <FlavorRow key={`${flavor.id}-${flavor.price}-${flavor.isActive}`} flavor={flavor} onSaved={setToast} />
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="export-title" className="flex flex-col gap-3">
        <h2 id="export-title" className="text-xl font-semibold">
          ייצוא
        </h2>
        <p className="text-ink-muted">כל ההזמנות (גם מבוטלות) בקובץ שנפתח באקסל. הכי נוח מהמחשב.</p>
        {/* A plain link, not <Link>: it downloads a file from the server, it doesn't navigate. */}
        <a
          href="/settings/export"
          download
          className="flex min-h-12 items-center justify-center rounded-xl border border-line bg-card px-4 text-lg font-semibold"
        >
          הורדת כל ההזמנות לאקסל (CSV)
        </a>
      </section>

      {toast && <Toast message={toast} onClose={closeToast} duration={3000} />}
    </div>
  );
}

function DayCard({ day, onSaved }: { day: FormDay; onSaved: (message: string) => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(day.isOpen);
  const [allowsPickup, setAllowsPickup] = useState(day.allowsPickup);
  const [allowsDelivery, setAllowsDelivery] = useState(day.allowsDelivery);
  const [maxText, setMaxText] = useState(String(day.maxBoxes));
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const maxBoxes = parseWholeNumber(maxText);
  const dirty =
    isOpen !== day.isOpen ||
    allowsPickup !== day.allowsPickup ||
    allowsDelivery !== day.allowsDelivery ||
    maxBoxes !== day.maxBoxes;
  const noService = !allowsPickup && !allowsDelivery;
  const inputId = `max-${day.day}`;

  async function save(confirmServiceOff = false) {
    if (maxBoxes === null) return setError(SETTINGS_ERRORS.maxBoxes);
    setPending(true);
    setError(null);
    const result = await updateDay({
      day: day.day,
      isOpen,
      allowsPickup,
      allowsDelivery,
      maxBoxes,
      confirmServiceOff,
    });
    setPending(false);
    if (result.status === "error") return setError(result.message);
    if (result.status === "confirm") return setConfirm(result.message);
    onSaved(result.closedForNoService ? `${day.label} נשמר כסגור (אין איסוף ומשלוחים)` : `${day.label} נשמר`);
    startTransition(() => router.refresh());
  }

  return (
    <article
      aria-label={day.label}
      className={`rounded-card border bg-card p-4 ${day.isOpen ? "border-line" : "border-dashed border-ink-muted"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {day.label} · {hebrewWeekday(day.day)} {shortDate(day.day)}
        </h3>
        <p className="shrink-0 text-ink-muted">
          הוזמנו <Ltr>{day.booked}</Ltr>
        </p>
      </div>

      <div className="mt-2 flex flex-col">
        <Switch label="פתוח להזמנות חדשות" checked={isOpen} onChange={setIsOpen} />
        <Switch label="איסוף עצמי" checked={allowsPickup} onChange={setAllowsPickup} />
        <Switch label="משלוחים" checked={allowsDelivery} onChange={setAllowsDelivery} />
      </div>
      {noService && (
        <p className="mt-1 text-ink-muted">בלי איסוף ובלי משלוחים, היום יישמר כסגור.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-lg">
          תקרת מארזים
        </label>
        <input
          id={inputId}
          inputMode="numeric"
          dir="ltr"
          value={maxText}
          onChange={(e) => {
            setMaxText(e.target.value);
            setError(null);
          }}
          aria-invalid={maxBoxes === null || undefined}
          className={numberInput}
        />
      </div>
      {maxBoxes !== null && maxBoxes < day.booked && (
        <p className="mt-1 text-requested">כבר הוזמנו {day.booked} מארזים, יותר מהתקרה הזו. ההזמנות נשארות.</p>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-unpaid-bg px-3 py-2 font-medium text-unpaid">
          {error}
        </p>
      )}

      {dirty && (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={pending} onClick={() => void save()} className={saveButton}>
            {pending ? "שומרת…" : "שמירה"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setIsOpen(day.isOpen);
              setAllowsPickup(day.allowsPickup);
              setAllowsDelivery(day.allowsDelivery);
              setMaxText(String(day.maxBoxes));
              setError(null);
            }}
            className="min-h-12 rounded-xl border border-line px-4 font-medium"
          >
            ביטול שינויים
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        message={confirm ?? ""}
        confirmLabel="כן, לשמור"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void save(true);
        }}
      />
    </article>
  );
}

function FlavorRow({ flavor, onSaved }: { flavor: MenuFlavor; onSaved: (message: string) => void }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [priceText, setPriceText] = useState(String(flavor.price));
  const [isActive, setIsActive] = useState(flavor.isActive);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const price = parseWholeNumber(priceText);
  const dirty = price !== flavor.price || isActive !== flavor.isActive;
  const inputId = `price-${flavor.id}`;

  async function save() {
    if (price === null) return setError(SETTINGS_ERRORS.price);
    setPending(true);
    setError(null);
    const result = await updateFlavor({ id: flavor.id, price, isActive });
    setPending(false);
    if (!result.ok) return setError(result.message);
    onSaved(`${flavor.name} נשמר`);
    startTransition(() => router.refresh());
  }

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`text-lg font-medium ${isActive ? "" : "text-ink-muted line-through"}`}>{flavor.name}</span>
        <div className="flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            מחיר {flavor.name}
          </label>
          <input
            id={inputId}
            inputMode="numeric"
            dir="ltr"
            value={priceText}
            onChange={(e) => {
              setPriceText(e.target.value);
              setError(null);
            }}
            aria-invalid={price === null || undefined}
            className={numberInput}
          />
          <span aria-hidden>₪</span>
        </div>
      </div>
      <Switch label="במכירה" checked={isActive} onChange={setIsActive} />
      {error && (
        <p role="alert" className="rounded-xl bg-unpaid-bg px-3 py-2 font-medium text-unpaid">
          {error}
        </p>
      )}
      {dirty && (
        <button type="button" disabled={pending} onClick={() => void save()} className={`${saveButton} self-start`}>
          {pending ? "שומרת…" : `שמירה${price !== null && price !== flavor.price ? ` (${formatShekels(price)})` : ""}`}
        </button>
      )}
    </li>
  );
}
