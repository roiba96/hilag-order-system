"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BUSINESS, PICKUP_WINDOW } from "@/lib/config";
import { formatShekels } from "@/lib/money";
import type { FormDay, MenuFlavor } from "@/lib/order-data";
import {
  type DraftBox,
  type OrderFormValues,
  boxProblems,
  draftToPriced,
  emptyBox,
  emptyValues,
  formWarnings,
} from "@/lib/order-form";
import type { ConfirmNeeded, FieldErrors, OrderField } from "@/lib/order-input";
import { phoneError } from "@/lib/phone";
import { type FulfillmentType, type OrderSource } from "@/lib/types";
import { type SaveResult, saveOrder } from "../actions";
import { BoxCard } from "./BoxCard";
import { DayPicker } from "./DayPicker";
import { SavedPanel } from "./SavedPanel";
import { SummaryCard } from "./SummaryCard";

type Props = {
  menu: MenuFlavor[];
  days: FormDay[];
  /** Editing: the order's id and its current values. Omitted for a new order. */
  edit?: { orderId: number; values: OrderFormValues };
};

type Saved = Extract<SaveResult, { status: "saved" }>;
type Confirmed = { closed: boolean; over: boolean };
type PendingConfirm = ConfirmNeeded & { send: boolean; confirmed: Confirmed };

const SOURCES: { value: OrderSource; label: string }[] = [
  { value: "whatsapp", label: "וואטסאפ" },
  { value: "instagram", label: "אינסטגרם" },
  { value: "tiktok", label: "טיקטוק" },
];

// Where to move focus when the server reports a problem with a field.
const FIELD_IDS: Record<OrderField, string> = {
  fullName: "fullName",
  phone: "phone",
  day: "day",
  fulfillment: "fulfillment",
  address: "address",
  city: "city",
  recipientPhone: "recipientPhone",
  boxes: "boxes",
};

const inputClass =
  "min-h-12 w-full rounded-xl border border-line bg-card px-4 text-lg text-ink aria-invalid:border-unpaid";

/**
 * The form as pages use it: a fresh, empty (or freshly loaded) form on every visit.
 * With Cache Components, Next.js keeps a page you leave mounted but hidden (React <Activity>)
 * and shows it again with its old state, so "הזמנה חדשה" reopened the last "ההזמנה נשמרה"
 * panel. bfcacheId changes on every link/push navigation (and stays on back/forward), so
 * keying on it starts over on each visit while the browser's back button still restores.
 */
export function FreshOrderForm(props: Props) {
  const { bfcacheId } = useRouter();
  return <OrderForm key={bfcacheId} {...props} />;
}

function OrderForm({ menu, days, edit }: Props) {
  const nextKey = useRef(1);
  const newKey = () => `box-${nextKey.current++}`;
  const initial = edit?.values ?? emptyValues();

  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [day, setDay] = useState(initial.day);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>(initial.fulfillment);
  const [address, setAddress] = useState(initial.address);
  const [city, setCity] = useState(initial.city);
  const [addressDetails, setAddressDetails] = useState(initial.addressDetails);
  const [courierNotes, setCourierNotes] = useState(initial.courierNotes);
  const [recipientName, setRecipientName] = useState(initial.recipientName);
  const [recipientPhone, setRecipientPhone] = useState(initial.recipientPhone);
  const [timeWindow, setTimeWindow] = useState(initial.timeWindow);
  const [notes, setNotes] = useState(initial.notes);
  const [source, setSource] = useState<OrderSource>(initial.source);
  const [boxes, setBoxes] = useState<DraftBox[]>(initial.boxes);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [saved, setSaved] = useState<{ result: Saved; wantsToSend: boolean } | null>(null);

  const selectedDay = days.find((d) => d.day === day);
  const pricedBoxes = boxes.map((box) => draftToPriced(box, menu));
  const delivery = fulfillment === "delivery";
  // Boxes must be full: saving is blocked until they are (the server and the database insist too).
  const unfilled = boxProblems(pricedBoxes);
  const blocked = pending || unfilled.length > 0;
  const warnings = formWarnings({ fullName, phone, fulfillment, address, city, day: selectedDay, boxes: pricedBoxes });

  function clearError(field: OrderField) {
    if (!errors[field]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function selectDay(value: string) {
    setDay(value);
    clearError("day");
    clearError("fulfillment");
    // Follow the day's settings: switch away from a service the day doesn't offer.
    const chosen = days.find((d) => d.day === value);
    if (chosen && fulfillment === "delivery" && !chosen.allowsDelivery) setFulfillment("pickup");
    if (chosen && fulfillment === "pickup" && !chosen.allowsPickup) setFulfillment("delivery");
  }

  function reset() {
    setFullName("");
    setPhone("");
    setDay("");
    setFulfillment("pickup");
    setAddress("");
    setCity("");
    setAddressDetails("");
    setCourierNotes("");
    setRecipientName("");
    setRecipientPhone("");
    setTimeWindow("");
    setNotes("");
    setSource("whatsapp");
    setBoxes([emptyBox(newKey())]);
    setErrors({});
    setGeneralError(null);
    setSaved(null);
    window.scrollTo({ top: 0 });
  }

  async function submit(send: boolean, confirmed: Confirmed = { closed: false, over: false }) {
    if (unfilled.length > 0) return;
    setPending(true);
    setGeneralError(null);
    try {
      const result = await saveOrder({
        ...(edit ? { orderId: edit.orderId } : {}),
        fullName,
        phone,
        day,
        fulfillment,
        address,
        city,
        addressDetails,
        courierNotes,
        recipientName,
        recipientPhone,
        timeWindow,
        notes,
        source,
        rawMessage: "",
        boxes: boxes.map((box) => ({
          ...(box.boxId ? { boxId: box.boxId } : {}),
          size: box.size,
          items: Object.entries(box.qty).map(([flavorId, qty]) => ({ flavorId: Number(flavorId), qty })),
        })),
        confirmClosed: confirmed.closed,
        confirmOver: confirmed.over,
      });

      if (result.status === "invalid") {
        setErrors(result.errors);
        const first = (Object.keys(FIELD_IDS) as OrderField[]).find((field) => result.errors[field]);
        if (first) {
          const element = document.getElementById(FIELD_IDS[first]);
          element?.scrollIntoView({ block: "center" });
          element?.focus({ preventScroll: true });
        }
      } else if (result.status === "confirm") {
        setConfirm({ kind: result.kind, message: result.message, send, confirmed });
      } else if (result.status === "error") {
        setGeneralError(result.message);
      } else {
        setSaved({ result, wantsToSend: send });
        window.scrollTo({ top: 0 });
      }
    } catch {
      setGeneralError("השמירה נכשלה. כדאי לבדוק את החיבור ולנסות שוב.");
    } finally {
      setPending(false);
    }
  }

  if (saved) return <SavedPanel {...saved} onNewOrder={edit ? undefined : reset} />;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit(true);
      }}
      className="flex flex-col gap-5"
    >
      <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-4">
        <Field id="fullName" label="שם מלא" error={errors.fullName}>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearError("fullName");
            }}
            autoComplete="off"
            aria-invalid={Boolean(errors.fullName) || undefined}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            className={inputClass}
          />
        </Field>

        <Field id="phone" label="טלפון" error={errors.phone}>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearError("phone");
            }}
            onBlur={() => {
              if (phone.trim()) {
                const problem = phoneError(phone);
                if (problem) setErrors((current) => ({ ...current, phone: problem }));
              }
            }}
            autoComplete="off"
            placeholder="052-123-4567"
            aria-invalid={Boolean(errors.phone) || undefined}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={`${inputClass} text-start`}
          />
        </Field>

        <Field id="source" label="הלקוחה הגיעה מ">
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value as OrderSource)}
            className={inputClass}
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section id="day" tabIndex={-1} className="rounded-card border border-line bg-card p-4 outline-none">
        <DayPicker days={days} selected={day} onSelect={selectDay} error={errors.day} />
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-4">
        <fieldset id="fulfillment" tabIndex={-1} className="outline-none">
          <legend className="mb-2 font-semibold">איסוף או משלוח</legend>
          <div className="grid grid-cols-2 gap-2">
            <ToggleButton
              pressed={fulfillment === "pickup"}
              disabled={Boolean(selectedDay && !selectedDay.allowsPickup)}
              onClick={() => {
                setFulfillment("pickup");
                clearError("fulfillment");
              }}
            >
              איסוף עצמי
            </ToggleButton>
            <ToggleButton
              pressed={delivery}
              disabled={Boolean(selectedDay && !selectedDay.allowsDelivery)}
              onClick={() => {
                setFulfillment("delivery");
                clearError("fulfillment");
              }}
            >
              משלוח
            </ToggleButton>
          </div>
          {selectedDay && !selectedDay.allowsDelivery && (
            <p className="mt-2 text-ink-muted">{selectedDay.label}: יש רק איסוף עצמי.</p>
          )}
          {selectedDay && !selectedDay.allowsPickup && (
            <p className="mt-2 text-ink-muted">{selectedDay.label}: יש רק משלוחים.</p>
          )}
          {errors.fulfillment && (
            <p role="alert" className="mt-2 font-medium text-unpaid">
              {errors.fulfillment}
            </p>
          )}
          <p className="mt-2 text-sm text-ink-muted">
            {delivery
              ? `משלוח: ${formatShekels(BUSINESS.deliveryFee)}, יוצא ב-${BUSINESS.batchTimes.delivery}.`
              : `איסוף עצמי ב${BUSINESS.pickupPlace}, ${PICKUP_WINDOW}.`}
          </p>
        </fieldset>

        {delivery && (
          <div className="flex flex-col gap-4">
            <Field id="address" label="רחוב ומספר בית" error={errors.address}>
              <input
                id="address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  clearError("address");
                }}
                autoComplete="off"
                placeholder="הדקל 5"
                aria-invalid={Boolean(errors.address) || undefined}
                aria-describedby={errors.address ? "address-error" : undefined}
                className={inputClass}
              />
            </Field>
            <Field id="city" label="עיר" error={errors.city}>
              <input
                id="city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  clearError("city");
                }}
                autoComplete="off"
                aria-invalid={Boolean(errors.city) || undefined}
                aria-describedby={errors.city ? "city-error" : undefined}
                className={inputClass}
              />
            </Field>
            <Field id="addressDetails" label="קומה / דירה / כניסה (לא חובה)">
              <input
                id="addressDetails"
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <Field id="courierNotes" label="הערות לשליח (לא חובה)" hint="למשל קוד לבניין">
              <input
                id="courierNotes"
                value={courierNotes}
                onChange={(e) => setCourierNotes(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
            </Field>
            <Field id="timeWindow" label="שעה מבוקשת (לא חובה)" hint="בקשה בלבד, לא התחייבות">
              <input
                id="timeWindow"
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
                autoComplete="off"
                className={inputClass}
              />
            </Field>

            <details className="rounded-xl border border-line p-3" open={Boolean(recipientName || recipientPhone || errors.recipientPhone)}>
              <summary className="flex min-h-11 cursor-pointer items-center font-medium">
                המשלוח למישהו אחר? (מתנה)
              </summary>
              <div className="mt-3 flex flex-col gap-4">
                <Field id="recipientName" label="שם מקבל המשלוח">
                  <input
                    id="recipientName"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    autoComplete="off"
                    className={inputClass}
                  />
                </Field>
                <Field id="recipientPhone" label="טלפון של מקבל המשלוח" error={errors.recipientPhone}>
                  <input
                    id="recipientPhone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    value={recipientPhone}
                    onChange={(e) => {
                      setRecipientPhone(e.target.value);
                      clearError("recipientPhone");
                    }}
                    autoComplete="off"
                    placeholder="052-123-4567"
                    aria-invalid={Boolean(errors.recipientPhone) || undefined}
                    aria-describedby={errors.recipientPhone ? "recipientPhone-error" : undefined}
                    className={`${inputClass} text-start`}
                  />
                </Field>
              </div>
            </details>
          </div>
        )}
      </section>

      <section id="boxes" tabIndex={-1} aria-label="מארזים" className="flex flex-col gap-3 outline-none">
        <h2 className="text-xl font-semibold">מארזים</h2>
        {errors.boxes && (
          <p role="alert" className="rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid">
            {errors.boxes}
          </p>
        )}
        {boxes.map((box, index) => (
          <BoxCard
            key={box.key}
            index={index}
            box={box}
            menu={menu}
            canRemove={boxes.length > 1}
            onChange={(updated) => {
              setBoxes((current) => current.map((b) => (b.key === box.key ? updated : b)));
              clearError("boxes");
            }}
            onRemove={() => setBoxes((current) => current.filter((b) => b.key !== box.key))}
          />
        ))}
        <button
          type="button"
          onClick={() => setBoxes((current) => [...current, emptyBox(newKey())])}
          className="min-h-12 rounded-xl border-2 border-dashed border-line bg-card px-4 text-lg font-semibold"
        >
          + הוספת מארז
        </button>
      </section>

      <section className="rounded-card border border-line bg-card p-4">
        <Field id="notes" label="הערות (לא חובה)" hint="אלרגיות, ברכה, כל דבר אחר">
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`${inputClass} py-3`}
          />
        </Field>
      </section>

      <SummaryCard boxes={pricedBoxes} fulfillment={fulfillment} warnings={warnings} />

      {generalError && (
        <p role="alert" className="rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid">
          {generalError}
        </p>
      )}

      <div className="flex flex-col gap-2 pb-6">
        {unfilled.length > 0 && (
          <div id="unfilled" role="status" className="rounded-xl bg-unpaid-bg px-4 py-3 font-medium text-unpaid">
            <p>אי אפשר לשמור עד שכל המארזים מלאים:</p>
            <ul className="mt-1 list-disc ps-5">
              {unfilled.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="submit"
          disabled={blocked}
          aria-describedby={unfilled.length > 0 ? "unfilled" : undefined}
          className="min-h-14 rounded-xl bg-ink px-4 text-lg font-semibold text-cream disabled:opacity-70"
        >
          {pending ? "שומרת…" : edit ? "שמירה ושליחת סיכום מעודכן" : "שמירה ושליחת סיכום ותשלום"}
        </button>
        <button
          type="button"
          disabled={blocked}
          aria-describedby={unfilled.length > 0 ? "unfilled" : undefined}
          onClick={() => void submit(false)}
          className="min-h-12 rounded-xl border border-line bg-surface px-4 font-medium disabled:opacity-70"
        >
          שמירה בלי לשלוח
        </button>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        message={confirm?.message ?? ""}
        confirmLabel="כן, לשמור"
        danger={confirm?.kind === "closed"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          const { send, confirmed, kind } = confirm;
          setConfirm(null);
          void submit(send, { ...confirmed, [kind]: true });
        }}
      />
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && <p className="-mt-1 text-sm text-ink-muted">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="font-medium text-unpaid">
          {error}
        </p>
      )}
    </div>
  );
}

function ToggleButton({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-12 rounded-xl border px-3 text-lg font-semibold disabled:opacity-40 ${
        pressed ? "border-ink bg-ink text-cream" : "border-line bg-card"
      }`}
    >
      {children}
    </button>
  );
}
