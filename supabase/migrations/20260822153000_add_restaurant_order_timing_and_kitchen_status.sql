alter table public.orders
  add column if not exists restaurant_received_at timestamptz,
  add column if not exists completed_at timestamptz;

comment on column public.orders.restaurant_received_at is
  'First observed receipt time of the authenticated inbound restaurant WhatsApp order message.';
comment on column public.orders.completed_at is
  'First time the order transitions to completed; preserved through later status changes.';

create or replace function public.set_restaurant_order_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  audit_received_at timestamptz;
begin
  if new.restaurant_received_at is null
     and new.kitchen_whapi_channel_id = 'GRNLTR-V67TK'
     and nullif(btrim(new.kitchen_whapi_message_id), '') is not null then
    select min(a.created_at)
      into audit_received_at
      from public.coco_webhook_audit a
     where a.message_id = new.kitchen_whapi_message_id
       and a.channel_id = new.kitchen_whapi_channel_id
       and a.event_type = 'messages.post';

    new.restaurant_received_at := coalesce(audit_received_at, now());
  end if;

  if new.completed_at is null
     and new.order_status::text = 'completed'
     and old.order_status::text is distinct from 'completed' then
    new.completed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_restaurant_order_timestamps on public.orders;
create trigger trg_set_restaurant_order_timestamps
before update on public.orders
for each row
execute function public.set_restaurant_order_timestamps();

create index if not exists idx_orders_restaurant_queue_status_received
  on public.orders (order_status, restaurant_received_at)
  where restaurant_received_at is not null;

create or replace function public.get_public_kitchen_status()
returns table (
  active_orders integer,
  oldest_wait_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  with active as (
    select restaurant_received_at
      from public.orders
     where restaurant_received_at is not null
       and kitchen_whapi_channel_id = 'GRNLTR-V67TK'
       and order_status::text in ('new', 'preparing', 'ready', 'out_for_delivery')
       and restaurant_received_at >= now() - interval '12 hours'
  )
  select
    count(*)::integer as active_orders,
    case
      when count(*) = 0 then null
      else greatest(
        0,
        floor(extract(epoch from (now() - min(restaurant_received_at))) / 60)::integer
      )
    end as oldest_wait_minutes
  from active;
$$;

revoke all on function public.get_public_kitchen_status() from public;
grant execute on function public.get_public_kitchen_status() to anon, authenticated, service_role;
