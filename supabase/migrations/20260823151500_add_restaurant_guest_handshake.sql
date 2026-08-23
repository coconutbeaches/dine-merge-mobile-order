create table if not exists public.restaurant_guest_handshakes (
  id uuid primary key default gen_random_uuid(),
  ref_hash text not null unique,
  table_number text not null,
  first_name text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
  match_kind text null check (match_kind is null or match_kind in ('hotel', 'walkin')),
  phone_e164 text null,
  whatsapp_chat_id text null,
  linked_incoming_guest_id uuid null references public.incoming_guests(id) on delete set null,
  matched_stay_id text null,
  match_method text null,
  match_confidence numeric null,
  provider_channel_id text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz null,
  reply_sent_at timestamptz null,
  last_error text null
);

create index if not exists idx_restaurant_guest_handshakes_status_expires
  on public.restaurant_guest_handshakes (status, expires_at);

create index if not exists idx_restaurant_guest_handshakes_phone
  on public.restaurant_guest_handshakes (phone_e164, created_at desc)
  where phone_e164 is not null;

alter table public.restaurant_guest_handshakes enable row level security;

create table if not exists public.restaurant_guest_links (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  stay_id text not null,
  first_name text null,
  linked_incoming_guest_id uuid null references public.incoming_guests(id) on delete set null,
  whatsapp_chat_id text null,
  provider_channel_id text null,
  match_method text null,
  match_confidence numeric null,
  first_linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  unique (phone_e164, stay_id)
);

create index if not exists idx_restaurant_guest_links_phone_last_seen
  on public.restaurant_guest_links (phone_e164, last_seen_at desc);

alter table public.restaurant_guest_links enable row level security;

comment on table public.restaurant_guest_handshakes is
  'Server-only one-time restaurant WhatsApp handshakes. Raw signed refs are never stored; only SHA-256 hashes.';

comment on table public.restaurant_guest_links is
  'Durable restaurant WhatsApp phone-to-active-stay identity links, independent of browser storage.';
