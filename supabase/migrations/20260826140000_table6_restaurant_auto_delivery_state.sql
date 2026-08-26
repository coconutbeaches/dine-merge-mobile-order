alter table public.orders
  add column if not exists restaurant_auto_delivery_status text,
  add column if not exists restaurant_auto_delivery_attempted_at timestamptz,
  add column if not exists restaurant_auto_delivery_completed_at timestamptz,
  add column if not exists restaurant_auto_delivery_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_restaurant_auto_delivery_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_restaurant_auto_delivery_status_check
      check (
        restaurant_auto_delivery_status is null
        or restaurant_auto_delivery_status in ('pending', 'sent', 'failed', 'uncertain')
      );
  end if;
end $$;

create index if not exists idx_orders_restaurant_auto_delivery_pending
  on public.orders (restaurant_auto_delivery_status, id)
  where table_number = '6'
    and restaurant_auto_delivery_status in ('pending', 'uncertain');

comment on column public.orders.restaurant_auto_delivery_status is
  'Table-scoped automatic restaurant WhatsApp delivery state. Table 6 is the initial live canary.';
comment on column public.orders.restaurant_auto_delivery_error is
  'Sanitized automatic delivery failure/uncertainty code; never stores provider response bodies or guest PII.';
