-- Single active restaurant popup notice, managed by admins and exposed to guests
-- only through a narrow read-only RPC.

create table if not exists public.restaurant_popup_notice (
  id smallint primary key default 1,
  message text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_popup_notice_singleton check (id = 1),
  constraint restaurant_popup_notice_message_length check (
    char_length(btrim(message)) between 1 and 500
  )
);

alter table public.restaurant_popup_notice enable row level security;

-- The admin API uses the service role. Guests never read this table directly.
revoke all on table public.restaurant_popup_notice from anon, authenticated;

create or replace function public.get_public_restaurant_popup()
returns table (
  message text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    notice.message,
    notice.expires_at
  from public.restaurant_popup_notice as notice
  where notice.id = 1
    and notice.expires_at > now()
    and btrim(notice.message) <> ''
  limit 1;
$$;

revoke all on function public.get_public_restaurant_popup() from public;
grant execute on function public.get_public_restaurant_popup() to anon, authenticated;
