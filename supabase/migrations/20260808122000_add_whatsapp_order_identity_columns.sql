-- Preserve the inbound WhatsApp sender alongside every restaurant order.
-- These fields are source evidence, not an assertion of passport identity.

alter table public.orders
  add column if not exists source_sender_id text,
  add column if not exists source_sender_phone_e164 text,
  add column if not exists source_message_id text,
  add column if not exists source_first_name text,
  add column if not exists source_display_name text,
  add column if not exists source_whapi_lid text;

create index if not exists idx_orders_source_sender_phone
  on public.orders (source_sender_phone_e164)
  where source_sender_phone_e164 is not null;

create index if not exists idx_orders_source_message_id
  on public.orders (source_message_id)
  where source_message_id is not null;
