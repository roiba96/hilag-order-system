-- 005: snapshot the customer's name on each order.
-- Run once in the Supabase SQL Editor, after 004.
--
-- Bug: orders showed customers.full_name, so a new order with the same phone and a new name
-- renamed every earlier order. Now each order keeps the name it was saved with
-- (orders.customer_name); customers.full_name still follows the latest name.

alter table orders add column customer_name text;

-- Existing orders: the name the customer has now (the best we have).
update orders o
   set customer_name = c.full_name
  from customers c
 where c.id = o.customer_id
   and o.customer_name is null;

alter table orders alter column customer_name set not null;

-- save_order (from 004) now also writes the order's own name, on create and on edit.
create or replace function save_order(p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order         jsonb := p -> 'order';
  v_send          boolean := coalesce((p ->> 'send')::boolean, false);
  v_order_id      bigint := (p ->> 'order_id')::bigint;
  v_name          text := p #>> '{customer,full_name}';
  v_phone         text := p #>> '{customer,phone}';
  v_now           timestamptz := now();
  v_customer_id   bigint;
  v_previous_name text;
  v_keep          bigint[];
  v_box           jsonb;
  v_box_id        bigint;
  v_expected      int;
  v_inserted      int;
begin
  -- 1. Customer: one per phone; the latest name wins on the customer (not on old orders).
  select id, full_name into v_customer_id, v_previous_name
    from customers
   where phone = v_phone;

  if v_customer_id is null then
    insert into customers (full_name, phone)
    values (v_name, v_phone)
    returning id into v_customer_id;
  elsif v_previous_name is distinct from v_name then
    update customers set full_name = v_name where id = v_customer_id;
  end if;

  -- 2. The order row, with its own copy of the name.
  if v_order_id is null then
    insert into orders (
      customer_id, customer_name, day, fulfillment, address, city, address_details, courier_notes,
      recipient_name, recipient_phone, time_window, delivery_fee, source, raw_message, notes,
      confirmation_sent_at, payment_requested_at, payment
    ) values (
      v_customer_id,
      v_name,
      (v_order ->> 'day')::date,
      (v_order ->> 'fulfillment')::fulfillment_type,
      v_order ->> 'address',
      v_order ->> 'city',
      v_order ->> 'address_details',
      v_order ->> 'courier_notes',
      v_order ->> 'recipient_name',
      v_order ->> 'recipient_phone',
      v_order ->> 'time_window',
      coalesce((v_order ->> 'delivery_fee')::numeric, 0),
      coalesce(v_order ->> 'source', 'whatsapp'),
      v_order ->> 'raw_message',
      v_order ->> 'notes',
      case when v_send then v_now end,
      case when v_send then v_now end,
      case when v_send then 'requested'::payment_status else 'unpaid'::payment_status end
    )
    returning id into v_order_id;
  else
    update orders set
      customer_id          = v_customer_id,
      customer_name        = v_name,
      day                  = (v_order ->> 'day')::date,
      fulfillment          = (v_order ->> 'fulfillment')::fulfillment_type,
      address              = v_order ->> 'address',
      city                 = v_order ->> 'city',
      address_details      = v_order ->> 'address_details',
      courier_notes        = v_order ->> 'courier_notes',
      recipient_name       = v_order ->> 'recipient_name',
      recipient_phone      = v_order ->> 'recipient_phone',
      time_window          = v_order ->> 'time_window',
      delivery_fee         = coalesce((v_order ->> 'delivery_fee')::numeric, 0),
      source               = coalesce(v_order ->> 'source', source),
      raw_message          = coalesce(v_order ->> 'raw_message', raw_message),
      notes                = v_order ->> 'notes',
      confirmation_sent_at = case when v_send then v_now else confirmation_sent_at end,
      payment_requested_at = case when v_send then v_now else payment_requested_at end,
      payment              = case when v_send and payment <> 'paid'
                                  then 'requested'::payment_status else payment end
    where id = v_order_id;

    if not found then
      raise exception 'order_not_found' using errcode = 'P0002';
    end if;

    select coalesce(array_agg(value::bigint), '{}')
      into v_keep
      from jsonb_array_elements_text(coalesce(p -> 'keep_box_ids', '[]'::jsonb));

    delete from boxes
     where order_id = v_order_id
       and not (id = any (v_keep));
  end if;

  -- 3. New boxes, with prices snapshotted from flavors right now. Only active flavors.
  for v_box in
    select value from jsonb_array_elements(coalesce(p -> 'boxes', '[]'::jsonb))
  loop
    insert into boxes (order_id, size)
    values (v_order_id, (v_box ->> 'size')::smallint)
    returning id into v_box_id;

    v_expected := jsonb_array_length(coalesce(v_box -> 'items', '[]'::jsonb));

    insert into box_items (box_id, flavor_id, qty, unit_price)
    select v_box_id, f.id, (i.value ->> 'qty')::smallint, f.price
      from jsonb_array_elements(coalesce(v_box -> 'items', '[]'::jsonb)) as i (value)
      join flavors f
        on f.id = (i.value ->> 'flavor_id')::smallint
       and f.is_active;

    get diagnostics v_inserted = row_count;
    if v_inserted <> v_expected then
      raise exception 'unknown_flavor' using errcode = 'P0001';
    end if;
  end loop;

  return jsonb_build_object(
    'order_id', v_order_id,
    'customer_id', v_customer_id,
    'previous_name', v_previous_name,
    'grand_total', (select grand_total from v_order_totals where order_id = v_order_id)
  );
end $$;

-- Grants (create or replace keeps them, restated so this file stands on its own):
-- logged-in users only, never anon. No new table: orders' grants from 003 cover the column.
revoke all on function save_order(jsonb) from public, anon;
grant execute on function save_order(jsonb) to authenticated;
