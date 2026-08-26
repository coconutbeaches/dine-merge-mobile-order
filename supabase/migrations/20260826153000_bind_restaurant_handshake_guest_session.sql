alter table public.restaurant_guest_handshakes
  add column if not exists bound_guest_user_id uuid null references public.guests(id) on delete set null,
  add column if not exists bound_guest_stay_id text null,
  add column if not exists bound_at timestamptz null;

create index if not exists idx_restaurant_guest_handshakes_bound_guest
  on public.restaurant_guest_handshakes (bound_guest_user_id, completed_at desc)
  where bound_guest_user_id is not null;

comment on column public.restaurant_guest_handshakes.bound_guest_user_id is
  'Exact menu guest session bound after the WhatsApp handshake completes. Auto-delivery must match orders to this guest id; names are never recipient identity.';

comment on column public.restaurant_guest_handshakes.bound_guest_stay_id is
  'Guest stay id captured at the same binding step as bound_guest_user_id.';
