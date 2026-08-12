-- Persistent restaurant identity is independent of a hotel stay. Orders keep
-- their own stay_id snapshot; these rows only say which durable WhatsApp
-- identity placed the order.

create table if not exists public.restaurant_customers (
  customer_id uuid primary key default gen_random_uuid(),
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_customer_identifiers (
  identifier_id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.restaurant_customers(customer_id) on delete restrict,
  identifier_type text not null
    check (identifier_type in ('whatsapp_phone', 'whapi_lid')),
  identifier_value text not null,
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_customer_identifier_value_nonempty
    check (identifier_value = btrim(identifier_value) and length(identifier_value) > 0),
  constraint restaurant_customer_identifier_phone_format
    check (
      identifier_type <> 'whatsapp_phone'
      or identifier_value ~ '^\+[1-9][0-9]{6,14}$'
    ),
  constraint restaurant_customer_identifier_lid_format
    check (
      identifier_type <> 'whapi_lid'
      or identifier_value ~ '^[^[:space:]]+@lid$'
    ),
  unique (identifier_type, identifier_value)
);

create index if not exists idx_restaurant_customer_identifiers_customer
  on public.restaurant_customer_identifiers (customer_id);

alter table public.orders
  add column if not exists restaurant_customer_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'orders_restaurant_customer_id_fkey'
       and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_restaurant_customer_id_fkey
      foreign key (restaurant_customer_id)
      references public.restaurant_customers(customer_id)
      on delete restrict;
  end if;
end
$$;

create index if not exists idx_orders_restaurant_customer_created
  on public.orders (restaurant_customer_id, created_at desc)
  where restaurant_customer_id is not null;

-- Service-role order writers are the only callers in this slice. Keep both
-- identity tables private-by-default if they are exposed through PostgREST.
alter table public.restaurant_customers enable row level security;
alter table public.restaurant_customer_identifiers enable row level security;

revoke all on table public.restaurant_customers from public, anon, authenticated;
revoke all on table public.restaurant_customer_identifiers from public, anon, authenticated;
grant select, insert, update on table public.restaurant_customers to service_role;
grant select, insert, update on table public.restaurant_customer_identifiers to service_role;

-- Resolve/create atomically so concurrent first orders with the same exact key
-- cannot manufacture two customers. A phone/LID pair already owned by two
-- customers returns a conflict and is never merged implicitly.
create or replace function public.resolve_restaurant_customer_identity(
  p_phone_e164 text default null,
  p_whapi_lid text default null
)
returns table(resolved_customer_id uuid, resolution text)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_phone text := nullif(btrim(p_phone_e164), '');
  v_lid text := nullif(btrim(p_whapi_lid), '');
  v_phone_customer uuid;
  v_lid_customer uuid;
  v_customer uuid;
  v_created boolean := false;
begin
  if v_phone is null and v_lid is null then
    return query select null::uuid, 'missing_identity'::text;
    return;
  end if;
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    return query select null::uuid, 'invalid_phone'::text;
    return;
  end if;
  if v_lid is not null and v_lid !~ '^[^[:space:]]+@lid$' then
    return query select null::uuid, 'invalid_lid'::text;
    return;
  end if;

  -- Deterministic lock order avoids same-key races and lock inversions.
  if v_phone is not null then
    perform pg_advisory_xact_lock(hashtextextended('restaurant:phone:' || v_phone, 0));
  end if;
  if v_lid is not null then
    perform pg_advisory_xact_lock(hashtextextended('restaurant:lid:' || v_lid, 0));
  end if;

  select customer_id into v_phone_customer
    from public.restaurant_customer_identifiers
   where identifier_type = 'whatsapp_phone'
     and identifier_value = v_phone;
  select customer_id into v_lid_customer
    from public.restaurant_customer_identifiers
   where identifier_type = 'whapi_lid'
     and identifier_value = v_lid;

  if v_phone_customer is not null
     and v_lid_customer is not null
     and v_phone_customer <> v_lid_customer then
    return query select null::uuid, 'conflicting_identifiers'::text;
    return;
  end if;

  v_customer := coalesce(v_phone_customer, v_lid_customer);
  if v_customer is null then
    insert into public.restaurant_customers default values
    returning customer_id into v_customer;
    v_created := true;
  end if;

  if v_phone is not null and v_phone_customer is null then
    insert into public.restaurant_customer_identifiers (
      customer_id, identifier_type, identifier_value
    ) values (
      v_customer, 'whatsapp_phone', v_phone
    );
  end if;
  if v_lid is not null and v_lid_customer is null then
    insert into public.restaurant_customer_identifiers (
      customer_id, identifier_type, identifier_value
    ) values (
      v_customer, 'whapi_lid', v_lid
    );
  end if;

  update public.restaurant_customer_identifiers
     set last_observed_at = now(), updated_at = now()
   where customer_id = v_customer
     and (
       (identifier_type = 'whatsapp_phone' and identifier_value = v_phone)
       or (identifier_type = 'whapi_lid' and identifier_value = v_lid)
     );
  update public.restaurant_customers
     set last_observed_at = now(), updated_at = now()
   where customer_id = v_customer;

  return query
  select v_customer, case when v_created then 'created' else 'reused' end;
end;
$$;

revoke execute on function public.resolve_restaurant_customer_identity(text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_restaurant_customer_identity(text, text)
  to service_role;

comment on table public.restaurant_customers is
  'Durable restaurant customer identity. Hotel guest versus walk-in remains order context.';
comment on table public.restaurant_customer_identifiers is
  'Exact WhatsApp phone/LID keys for one durable restaurant customer; ambiguous identities are not merged.';
comment on column public.orders.restaurant_customer_id is
  'Stable restaurant customer that placed this order; stay_id remains the immutable order-time billing context.';
