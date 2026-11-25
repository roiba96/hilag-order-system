// Test helper: complete saved orders to spread over.
import type { SavedOrder } from "./order-data";

export const savedOrder: SavedOrder = {
  id: 12,
  customerName: "דנה כהן",
  customer: { id: 1, fullName: "מישהי אחרת", phone: "972521234567" },
  day: "2026-12-07",
  fulfillment: "pickup",
  address: null,
  city: null,
  addressDetails: null,
  courierNotes: null,
  recipientName: null,
  recipientPhone: null,
  timeWindow: null,
  notes: null,
  source: "whatsapp",
  status: "new",
  payment: "unpaid",
  confirmationSentAt: null,
  paymentRequestedAt: null,
  paidAt: null,
  reminderSentAt: null,
  deliveryFee: 0,
  createdAt: "2026-11-23T10:00:00Z",
  boxes: [
    {
      id: 1,
      size: 4,
      items: [
        { flavorId: 3, name: "שוקולד", qty: 2, unitPrice: 20 },
        { flavorId: 5, name: "קינדר", qty: 2, unitPrice: 22 },
      ],
    },
  ],
  total: 84,
};

/** A delivery sent as a gift: its own recipient, at its own address. */
export const giftOrder: SavedOrder = {
  ...savedOrder,
  id: 13,
  fulfillment: "delivery",
  address: "הדקל 5",
  addressDetails: "קומה 3",
  city: "נתניה",
  recipientName: "סבתא רינה",
  recipientPhone: "972541112222",
  deliveryFee: 40,
  total: 124,
};
