-- 006: the day trigger's messages read naturally with any day label.
-- Run once in the Supabase SQL Editor, after 005.
--
-- schema.sql wrote 'אין משלוחים ב%' with the label: fine for "נר ראשון", but the baker's new days are
-- labelled "לפני החג" and "ערב החג", which gave "אין משלוחים בלפני החג". The label now leads,
-- followed by a colon, with the same three messages the app shows (dayRuleError in
-- src/lib/order-input.ts). Same rules as before; only the wording changes.

create or replace function check_order_day() returns trigger
language plpgsql as $$
declare d sale_days;
begin
  select * into d from sale_days where day = new.day;
  if not d.allows_pickup and not d.allows_delivery then
    raise exception '%: אין הזמנות ביום הזה.', d.label;
  end if;
  if new.fulfillment = 'delivery' and not d.allows_delivery then
    raise exception '%: יש רק איסוף עצמי.', d.label;
  end if;
  if new.fulfillment = 'pickup' and not d.allows_pickup then
    raise exception '%: אין איסוף עצמי.', d.label;
  end if;
  return new;
end $$;

-- Grants (create or replace keeps them, restated so this file stands on its own):
-- logged-in users only, never anon. The trigger itself (trg_check_order_day) is unchanged.
revoke all on function check_order_day() from public, anon;
grant execute on function check_order_day() to authenticated;
