// Israeli mobile numbers. Stored as 9725XXXXXXXX (digits only, no 0, no +): ready for WhatsApp links (the phone= parameter).

export const PHONE_ERRORS = {
  missing: "צריך למלא מספר טלפון.",
  invalid: "המספר לא נראה כמו נייד ישראלי. למשל: 052-123-4567",
} as const;

const NORMALIZED = /^9725\d{8}$/;

/**
 * Any common way of writing an Israeli mobile → "9725XXXXXXXX", or null if it isn't one.
 * Accepts 052-123-4567, 0521234567, +972 52-123-4567, 00972521234567, 972-052-1234567,
 * and spaces, dots, dashes or brackets anywhere.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2); // 00972...
  if (digits.startsWith("9720")) digits = `972${digits.slice(4)}`; // +972 052... (stray 0)
  if (digits.startsWith("05") && digits.length === 10) digits = `972${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) digits = `972${digits}`;
  return NORMALIZED.test(digits) ? digits : null;
}

/** Hebrew validation message for a phone input, or null when it's fine. */
export function phoneError(input: string): string | null {
  if (!input.trim()) return PHONE_ERRORS.missing;
  return normalizePhone(input) ? null : PHONE_ERRORS.invalid;
}

/** "972521234567" → "052-123-4567". Anything else is returned unchanged. */
export function formatPhone(phone: string): string {
  if (!NORMALIZED.test(phone)) return phone;
  const local = `0${phone.slice(3)}`;
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
}

/** Tap-to-call link: "tel:+972521234567". */
export function telLink(phone: string): string {
  return `tel:+${phone}`;
}
