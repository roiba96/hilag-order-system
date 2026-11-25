// Click-to-chat links (no WhatsApp API): open WhatsApp with the text ready; the baker taps send.
//
// Links go straight to https://api.whatsapp.com/send. NOT wa.me: wa.me answers with a 302
// redirect to api.whatsapp.com, and on iPhone + WhatsApp Business every 4-byte character
// (all emoji) arrived as "�" through that redirect, while 3-byte ones like ₪ survived.
// api.whatsapp.com is a universal link on iOS, so WhatsApp Business (or WhatsApp) opens it.

const WHATSAPP_SEND = "https://api.whatsapp.com/send";

/**
 * The exact text that goes into the link: NFC-normalized and well-formed UTF-16 (a lone
 * surrogate becomes U+FFFD instead of making encodeURIComponent throw). Never sliced or
 * truncated anywhere, so emoji surrogate pairs stay whole.
 */
export function waText(text: string): string {
  return text.normalize("NFC").toWellFormed();
}

/**
 * https://api.whatsapp.com/send?phone=972521234567&text=... with the text encoded exactly once
 * (encodeURIComponent of the whole string: every emoji becomes its full 4-byte UTF-8 sequence).
 * Phone must be normalized (see normalizePhone). Built on the server; the browser uses the URL
 * as is and never re-encodes it.
 */
export function waLink(phone: string, text: string): string {
  if (!/^9725\d{8}$/.test(phone)) {
    throw new Error("waLink needs a normalized phone (9725XXXXXXXX)");
  }
  return `${WHATSAPP_SEND}?phone=${phone}&text=${encodeURIComponent(waText(text))}`;
}
