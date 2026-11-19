begin;
create table public.restaurant_hours_faq_attempts (
  channel_id text not null default 'GRNLTR-V67TK' check (channel_id = 'GRNLTR-V67TK'),
  inbound_message_id text not null check (inbound_message_id ~ '^[A-Za-z0-9._-]{1,250}$'),
  claimed_at timestamptz not null default now(),
  status text not null default 'claimed' check (status in ('claimed','sent','failed','uncertain','expired')),
  provider_message_id text,
  finished_at timestamptz,
  primary key (channel_id, inbound_message_id),
  check ((status = 'sent') = (provider_message_id is not null)),
  check ((status = 'claimed') = (finished_at is null))
);
alter table public.restaurant_hours_faq_attempts enable row level security;
revoke all on public.restaurant_hours_faq_attempts from public, anon, authenticated, service_role;
grant select on public.restaurant_hours_faq_attempts to service_role;
grant insert (channel_id, inbound_message_id) on public.restaurant_hours_faq_attempts to service_role;
grant update (status, provider_message_id, finished_at) on public.restaurant_hours_faq_attempts to service_role;
commit;
