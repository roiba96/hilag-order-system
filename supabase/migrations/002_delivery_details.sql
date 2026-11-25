-- 002: full delivery details on orders.
-- orders.address stays "street + house number" and orders.city stays the city.
-- Everything here is optional (null for pickup orders).
-- Run once in the Supabase SQL Editor, after schema.sql.

alter table orders
  add column address_details text,   -- floor / apartment / entrance
  add column courier_notes   text,   -- for the courier, e.g. a building code
  add column recipient_name  text,   -- when the recipient isn't the customer (a gift)
  add column recipient_phone text    -- same format as customers.phone: 9725XXXXXXXX
    check (recipient_phone is null or recipient_phone ~ '^9725[0-9]{8}$');
