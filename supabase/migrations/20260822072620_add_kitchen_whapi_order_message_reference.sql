-- Exact outbound kitchen-message identity for deterministic order actions.
-- Nullable/additive: historical orders are intentionally left unsupported.

alter table public.orders
  add column if not exists kitchen_whapi_message_id text,
  add column if not exists kitchen_whapi_channel_id text,
  add column if not exists kitchen_whapi_chat_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_kitchen_whapi_reference_complete'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_kitchen_whapi_reference_complete
      check (
        (
          kitchen_whapi_message_id is null
          and kitchen_whapi_channel_id is null
          and kitchen_whapi_chat_id is null
        )
        or
        (
          kitchen_whapi_message_id is not null
          and kitchen_whapi_channel_id is not null
          and kitchen_whapi_chat_id is not null
          and kitchen_whapi_message_id = btrim(kitchen_whapi_message_id)
          and length(kitchen_whapi_message_id) between 4 and 512
          and kitchen_whapi_channel_id = btrim(kitchen_whapi_channel_id)
          and length(kitchen_whapi_channel_id) between 1 and 64
          and kitchen_whapi_chat_id = btrim(kitchen_whapi_chat_id)
          and length(kitchen_whapi_chat_id) between 7 and 128
        )
      );
  end if;
end
$$;

create unique index if not exists idx_orders_kitchen_whapi_message_unique
  on public.orders (kitchen_whapi_message_id, kitchen_whapi_channel_id)
  where kitchen_whapi_message_id is not null;

comment on column public.orders.kitchen_whapi_message_id is
  'Exact outbound WHAPI kitchen message targeted by authorized restaurant actions.';
comment on column public.orders.kitchen_whapi_channel_id is
  'WHAPI channel that sent the kitchen message.';
comment on column public.orders.kitchen_whapi_chat_id is
  'Canonical WhatsApp chat containing the kitchen message.';
