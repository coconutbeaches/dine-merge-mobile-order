begin;
-- One durable send attempt per order, independent of status and reaction mirroring.
create table public.restaurant_feedback_poll_attempts (
  order_id bigint primary key,
  channel_id text not null,
  source_event_id text not null,
  claimed_at timestamptz not null default now(),
  status text not null default 'claimed' check (status in ('claimed','sent','failed','uncertain','expired')),
  provider_message_id text,
  finished_at timestamptz,
  unique (channel_id, source_event_id),
  check ((status = 'sent') = (provider_message_id is not null)),
  check ((status = 'claimed') = (finished_at is null))
);
alter table public.restaurant_feedback_poll_attempts enable row level security;
revoke all on public.restaurant_feedback_poll_attempts from public, anon, authenticated, service_role;
grant select, insert on public.restaurant_feedback_poll_attempts to service_role;
grant update (status, provider_message_id, finished_at) on public.restaurant_feedback_poll_attempts to service_role;

create function public.restaurant_claim_feedback_poll_v1(
  p_target_message text, p_target_chat text, p_channel text,
  p_restaurant_phone text, p_event_id text,
  p_event_at timestamptz, p_live_after timestamptz, p_order_cutoff timestamptz
) returns table (order_id bigint, guest_chat text)
language plpgsql security invoker set search_path = ''
as $$
declare
  selected_id bigint;
  matches integer;
  linked public.orders%rowtype;
  claim_id bigint;
begin
  if current_user <> 'service_role' then raise insufficient_privilege; end if;
  if p_event_at is null or p_live_after is null or p_order_cutoff is null
    or not isfinite(p_event_at) or not isfinite(p_live_after) or not isfinite(p_order_cutoff)
    or p_event_at < p_live_after or p_event_at < now() - interval '2 minutes'
    or p_event_at > now() + interval '5 seconds' then return; end if;
  if coalesce(length(p_target_message),0) not between 1 and 250
    or coalesce(length(p_event_id),0) not between 1 and 250
    or p_event_id = p_target_message
    or coalesce(p_channel,'') !~ '^[A-Z0-9-]{1,100}$'
    or coalesce(p_restaurant_phone,'') !~ '^[1-9][0-9]{7,14}$'
    or coalesce(p_target_chat,'') !~ '^[1-9][0-9]{7,14}@s\.whatsapp\.net$'
    or p_target_chat = p_restaurant_phone || '@s.whatsapp.net' then return; end if;

  -- Use the same target lock as both deployed transport bind/finalize writers.
  perform pg_advisory_xact_lock(hashtextextended(p_channel || chr(31) || p_target_message, 0));
  select count(*), min(t.id) into matches, selected_id from (
    select o.id from public.orders o
      where o.kitchen_whapi_message_id = p_target_message and o.kitchen_whapi_channel_id = p_channel
    union all
    select k.order_id from public.restaurant_kitchen_notifications k
      where k.message_id = p_target_message and k.channel_id = p_channel and k.status = 'sent'
  ) t;
  if matches <> 1 then return; end if;
  select o.* into linked from public.orders o where o.id = selected_id for update;
  if not found or linked.created_at is null or linked.created_at < p_order_cutoff or linked.created_at > now()
    or linked.kitchen_whapi_channel_id is distinct from p_channel
    or coalesce(length(linked.kitchen_whapi_message_id),0) not between 1 and 250
    or coalesce(linked.kitchen_whapi_chat_id,'') !~ '^[1-9][0-9]{7,14}@s\.whatsapp\.net$'
    or linked.kitchen_whapi_chat_id = p_restaurant_phone || '@s.whatsapp.net' then return; end if;
  if linked.kitchen_whapi_chat_id is distinct from p_target_chat
      or linked.kitchen_whapi_message_id is distinct from p_target_message then return; end if;

  insert into public.restaurant_feedback_poll_attempts as f (order_id, channel_id, source_event_id)
    values (selected_id, p_channel, p_event_id) on conflict do nothing returning f.order_id into claim_id;
  if claim_id is not null then return query select claim_id, linked.kitchen_whapi_chat_id; end if;
end;
$$;
revoke all on function public.restaurant_claim_feedback_poll_v1(text,text,text,text,text,timestamptz,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.restaurant_claim_feedback_poll_v1(text,text,text,text,text,timestamptz,timestamptz,timestamptz)
  to service_role;
commit;
