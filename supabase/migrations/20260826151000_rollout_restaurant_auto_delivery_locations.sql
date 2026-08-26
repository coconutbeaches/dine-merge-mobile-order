drop index if exists public.idx_orders_restaurant_auto_delivery_pending;

create index idx_orders_restaurant_auto_delivery_pending
  on public.orders (restaurant_auto_delivery_status, id)
  where (
    table_number = 'Take Away'
    or table_number ~ '^[1-9][0-9]*$'
  )
    and restaurant_auto_delivery_status in ('pending', 'uncertain');

comment on column public.orders.restaurant_auto_delivery_status is
  'Automatic restaurant WhatsApp delivery state for positive numeric tables and Take Away; other order locations remain outside the automatic flow.';
