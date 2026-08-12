-- Staff status reactions must resolve through an exact provider message
-- reference. The reference is additive and leaves customer/StayID history
-- untouched.

alter table public.orders
  add column if not exists status_message_id text,
  add column if not exists status_message_chat_id text,
  add column if not exists status_message_channel_id text;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'orders_status_message_reference_complete'
       and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_status_message_reference_complete
      check (
        (
          status_message_id is null
          and status_message_chat_id is null
          and status_message_channel_id is null
        )
        or
        (
          status_message_id is not null
          and status_message_chat_id is not null
          and status_message_channel_id is not null
          and status_message_id = btrim(status_message_id)
          and length(status_message_id) between 4 and 512
          and status_message_chat_id = btrim(status_message_chat_id)
          and length(status_message_chat_id) between 7 and 128
          and status_message_channel_id = btrim(status_message_channel_id)
          and length(status_message_channel_id) between 1 and 64
        )
      );
  end if;
end
$$;

create unique index if not exists idx_orders_status_message_provider_unique
  on public.orders (status_message_channel_id, status_message_id)
  where status_message_id is not null;

comment on column public.orders.status_message_id is
  'Exact WHAPI message whose authorized staff reactions may advance this order status.';
comment on column public.orders.status_message_chat_id is
  'Exact WhatsApp chat for the status-message reaction target.';
comment on column public.orders.status_message_channel_id is
  'Exact WHAPI channel for the status-message reaction target.';
