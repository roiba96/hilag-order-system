-- =====================================================================
-- HiLAG — מערכת הזמנות סופגניות לחנוכה 2026
-- Supabase / PostgreSQL. להריץ פעם אחת ב-SQL Editor של Supabase.
-- =====================================================================

-- ---------- טבלאות בסיס ----------

create table flavors (
  id          smallint generated always as identity primary key,
  name        text not null unique,
  price       numeric(6,2) not null check (price >= 0),
  sort_order  smallint not null default 0,
  is_active   boolean not null default true
);

-- כל יום מכירה: מה מותר בו, מה התקרה, והאם פתוח להזמנות חדשות
create table sale_days (
  day              date primary key,
  label            text not null,
  allows_pickup    boolean not null default true,
  allows_delivery  boolean not null default false,
  max_boxes        int not null check (max_boxes >= 0),
  is_open          boolean not null default true   -- בעלת המאפייה סוגרת/פותחת ידנית
);

create table customers (
  id          bigint generated always as identity primary key,
  full_name   text not null,
  phone       text not null unique,   -- פורמט אחיד: 9725XXXXXXXX (מוכן לקישורי wa.me)
  notes       text,
  created_at  timestamptz not null default now()
);

create type fulfillment_type as enum ('pickup', 'delivery');
create type order_status     as enum ('new', 'confirmed', 'ready', 'completed', 'cancelled');
create type payment_status   as enum ('unpaid', 'requested', 'paid');

create table orders (
  id                    bigint generated always as identity primary key,
  customer_id           bigint not null references customers(id),
  day                   date not null references sale_days(day),
  fulfillment           fulfillment_type not null,
  address               text,
  city                  text,
  time_window           text,                         -- בקשה בלבד, לא התחייבות
  delivery_fee          numeric(6,2) not null default 0,
  status                order_status not null default 'new',
  payment               payment_status not null default 'unpaid',
  payment_requested_at  timestamptz,
  paid_at               timestamptz,
  confirmation_sent_at  timestamptz,
  reminder_sent_at      timestamptz,
  source                text not null default 'whatsapp',  -- whatsapp / instagram / tiktok
  raw_message           text,                         -- ההודעה המקורית שהודבקה
  notes                 text,
  created_at            timestamptz not null default now(),
  check (fulfillment = 'pickup' or address is not null)
);

create table boxes (
  id        bigint generated always as identity primary key,
  order_id  bigint not null references orders(id) on delete cascade,
  size      smallint not null check (size in (4, 6))
);

-- הרכב כל מארז. unit_price נשמר כ"צילום" של המחיר בזמן ההזמנה
create table box_items (
  box_id      bigint not null references boxes(id) on delete cascade,
  flavor_id   smallint not null references flavors(id),
  qty         smallint not null check (qty > 0),
  unit_price  numeric(6,2) not null,
  primary key (box_id, flavor_id)
);

create index on orders (day);
create index on orders (customer_id);
create index on boxes (order_id);

-- ---------- חוקים ----------

-- אין משלוח ביום של איסוף בלבד, ואין הזמנות בשבת
create function check_order_day() returns trigger
language plpgsql as $$
declare d sale_days;
begin
  select * into d from sale_days where day = new.day;
  if new.fulfillment = 'delivery' and not d.allows_delivery then
    raise exception 'אין משלוחים ב%', d.label;
  end if;
  if new.fulfillment = 'pickup' and not d.allows_pickup then
    raise exception 'אין איסוף ב%', d.label;
  end if;
  return new;
end $$;

create trigger trg_check_order_day
before insert or update of day, fulfillment on orders
for each row execute function check_order_day();

-- ---------- תצוגות (views) ----------

-- סיכום לכל הזמנה: מארזים, סופגניות, סכום
create view v_order_totals with (security_invoker = true) as
select o.id as order_id,
       count(distinct b.id)                                    as box_count,
       coalesce(sum(bi.qty), 0)                                as donut_count,
       coalesce(sum(bi.qty * bi.unit_price), 0)                as items_total,
       coalesce(sum(bi.qty * bi.unit_price), 0) + o.delivery_fee as grand_total
from orders o
left join boxes b      on b.order_id = o.id
left join box_items bi on bi.box_id  = b.id
group by o.id, o.delivery_fee;

-- מארזים שהרכבם לא מסתכם בגודל שלהם (לבדיקה)
create view v_box_mismatch with (security_invoker = true) as
select b.id as box_id, b.order_id, b.size, coalesce(sum(bi.qty), 0) as filled
from boxes b
left join box_items bi on bi.box_id = b.id
group by b.id
having coalesce(sum(bi.qty), 0) <> b.size;

-- מסך היום: כמה מארזים, כמה נשאר, משלוחים/איסופים, מי לא שילם
create view v_day_summary with (security_invoker = true) as
select d.day, d.label, d.max_boxes, d.is_open,
       coalesce(sum(t.box_count) filter (where o.status <> 'cancelled'), 0)               as boxes_booked,
       d.max_boxes - coalesce(sum(t.box_count) filter (where o.status <> 'cancelled'), 0) as boxes_left,
       count(o.id) filter (where o.status <> 'cancelled')                                 as orders,
       count(o.id) filter (where o.status <> 'cancelled' and o.fulfillment = 'pickup')    as pickups,
       count(o.id) filter (where o.status <> 'cancelled' and o.fulfillment = 'delivery')  as deliveries,
       count(o.id) filter (where o.status <> 'cancelled' and o.payment <> 'paid')         as unpaid_orders,
       coalesce(sum(t.grand_total) filter (where o.status <> 'cancelled'), 0)             as revenue
from sale_days d
left join orders o         on o.day = d.day
left join v_order_totals t on t.order_id = o.id
group by d.day;

-- רשימת טיגון: לכל יום ולכל סבב (משלוחים מוכנים ב-11, איסוף ב-15) — כמה מכל טעם
create view v_frying with (security_invoker = true) as
select o.day,
       o.fulfillment as batch,
       case o.fulfillment when 'delivery' then time '11:00' else time '15:00' end as ready_by,
       f.name as flavor, f.sort_order,
       sum(bi.qty) as qty
from orders o
join boxes b      on b.order_id = o.id
join box_items bi on bi.box_id  = b.id
join flavors f    on f.id       = bi.flavor_id
where o.status <> 'cancelled'
group by o.day, o.fulfillment, f.name, f.sort_order;

-- כמה מארזי 4 ו-6 צריך לכל יום (לאריזה)
create view v_boxes_by_size with (security_invoker = true) as
select o.day, b.size, count(*) as boxes
from orders o
join boxes b on b.order_id = o.id
where o.status <> 'cancelled'
group by o.day, b.size;

-- ---------- הרשאות: רק משתמש מחובר (בעלת המאפייה) ----------

alter table flavors   enable row level security;
alter table sale_days enable row level security;
alter table customers enable row level security;
alter table orders    enable row level security;
alter table boxes     enable row level security;
alter table box_items enable row level security;

create policy "auth full access" on flavors   for all to authenticated using (true) with check (true);
create policy "auth full access" on sale_days for all to authenticated using (true) with check (true);
create policy "auth full access" on customers for all to authenticated using (true) with check (true);
create policy "auth full access" on orders    for all to authenticated using (true) with check (true);
create policy "auth full access" on boxes     for all to authenticated using (true) with check (true);
create policy "auth full access" on box_items for all to authenticated using (true) with check (true);

-- ---------- נתוני פתיחה ----------

insert into flavors (name, price, sort_order) values
  ('ריבה קלאסית', 16, 1),
  ('ריבת חלב',    18, 2),
  ('שוקולד',      20, 3),
  ('סינבון',      22, 4),
  ('קינדר',       22, 5),
  ('הרשיז',       24, 6);

insert into sale_days (day, label, allows_pickup, allows_delivery, max_boxes, is_open) values
  ('2026-12-04', 'נר ראשון',      true,  false, 20, true),
  ('2026-12-05', 'נר שני (שבת)',  false, false,  0, false),
  ('2026-12-06', 'נר שלישי',      true,  true,  50, true),
  ('2026-12-07', 'נר רביעי',      true,  true,  50, true),
  ('2026-12-08', 'נר חמישי',      true,  true,  50, true),
  ('2026-12-09', 'נר שישי',       true,  true,  50, true),
  ('2026-12-10', 'נר שביעי',      true,  true,  50, true),
  ('2026-12-11', 'נר שמיני',      true,  false, 20, true);
