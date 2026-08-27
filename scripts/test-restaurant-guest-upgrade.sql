\set ON_ERROR_STOP on
-- Run only in an empty disposable local database. Everything rolls back.
begin;
create table public.restaurant_guest_handshakes (
  id uuid primary key,
  status text not null,
  bound_guest_user_id uuid,
  bound_guest_stay_id text,
  completed_at timestamptz
);
alter table public.restaurant_guest_handshakes enable row level security;
insert into public.restaurant_guest_handshakes (id, status) values
  ('11111111-1111-4111-8111-111111111111', 'pending');
create temporary table original_handshake as
  select to_jsonb(h) as body from public.restaurant_guest_handshakes h;

\ir ../supabase/migrations/20260827082118_restaurant_existing_guest_upgrade.sql

do $$
begin
  if exists (
    select 1 from public.restaurant_guest_handshakes h, original_handshake original
    where (to_jsonb(h) - 'upgrade_guest_user_id' - 'upgrade_guest_stay_id') is distinct from original.body
  ) then raise exception 'Historical handshake changed'; end if;

  if not (select relrowsecurity from pg_class where oid = 'public.restaurant_guest_handshakes'::regclass)
  then raise exception 'RLS was disabled'; end if;

  begin
    update public.restaurant_guest_handshakes set upgrade_guest_user_id = id;
    raise exception 'Half-null target was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.restaurant_guest_handshakes set upgrade_guest_stay_id = 'walkin-test';
    raise exception 'Half-null target was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.restaurant_guest_handshakes set upgrade_guest_user_id = id, upgrade_guest_stay_id = '';
    raise exception 'Empty stay was accepted';
  exception when check_violation then null;
  end;

  update public.restaurant_guest_handshakes
  set upgrade_guest_user_id = id, upgrade_guest_stay_id = 'walkin-test';
  if exists (select 1 from public.restaurant_guest_handshakes where bound_guest_user_id is not null or bound_guest_stay_id is not null)
  then raise exception 'Unverified target became a binding'; end if;
end;
$$;
select 'PASS: additive migration, paired target, RLS and unbound state preserved' as result;
rollback;
