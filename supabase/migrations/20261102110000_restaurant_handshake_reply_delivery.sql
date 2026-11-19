set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.restaurant_guest_handshakes
  add column if not exists inbound_message_id text null,
  add column if not exists reply_delivery_state text not null default 'pending',
  add column if not exists reply_attempted_at timestamptz null,
  add column if not exists reply_provider_message_id text null;

alter table public.restaurant_guest_handshakes
  drop constraint if exists restaurant_guest_handshakes_reply_delivery_state_check,
  add constraint restaurant_guest_handshakes_reply_delivery_state_check
    check (reply_delivery_state in ('pending', 'sending', 'sent', 'uncertain')) not valid;

alter table public.restaurant_guest_handshakes
  validate constraint restaurant_guest_handshakes_reply_delivery_state_check;

create unique index if not exists idx_restaurant_guest_handshakes_inbound_message
  on public.restaurant_guest_handshakes (provider_channel_id, inbound_message_id)
  where provider_channel_id is not null and inbound_message_id is not null;

comment on column public.restaurant_guest_handshakes.inbound_message_id is
  'Authenticated WHAPI inbound message that completed this one-time handshake.';
comment on column public.restaurant_guest_handshakes.reply_delivery_state is
  'Durable one-attempt menu-reply state. sending/uncertain require reconciliation, never automatic resend.';
comment on column public.restaurant_guest_handshakes.reply_provider_message_id is
  'WHAPI message id returned only after an acknowledged menu reply.';

update public.restaurant_guest_handshakes
set reply_delivery_state = 'sent'
where reply_delivery_state = 'pending'
  and reply_sent_at is not null;

update public.restaurant_guest_handshakes
set reply_delivery_state = 'uncertain'
where reply_delivery_state = 'pending'
  and status = 'completed'
  and reply_sent_at is null;
