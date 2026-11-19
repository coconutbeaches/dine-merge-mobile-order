-- PROPOSAL ONLY. NOT APPLIED. Review existing schema/privileges before migration.
-- Application authenticates provider/channel/operator before this service-only RPC.
-- Locks target notification and order; validates exact target and CAS within one transaction.
begin;
create or replace function public.restaurant_apply_kitchen_reaction_v1(
  p_order_id bigint, p_message_id text, p_chat_id text, p_channel_id text,
  p_expected_status text, p_target_status text, p_live_after timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_notification public.restaurant_kitchen_notifications%rowtype;
  v_order public.orders%rowtype;
  v_count integer;
begin
  -- EXECUTE grant is primary restriction; explicit guard also protects mistaken grants.
  if current_user <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_expected_status is null or p_target_status is null or p_live_after is null or not isfinite(p_live_after) then return false; end if;
  if p_order_id is null or p_order_id <= 0 or
     coalesce(length(p_message_id),0) not between 1 and 250 or
     coalesce(length(p_chat_id),0) not between 1 and 250 or
     coalesce(length(p_channel_id),0) not between 1 and 250 then return false; end if;
  -- Serializes reaction RPCs for one target, without global table locks.
  perform pg_advisory_xact_lock(hashtextextended(p_channel_id || chr(31) || p_message_id, 0));
  -- Lock all currently competing target rows before resolving exact ambiguity.
  perform 1 from public.orders where kitchen_whapi_message_id=p_message_id
    and kitchen_whapi_channel_id=p_channel_id order by id for update;
  perform 1 from public.restaurant_kitchen_notifications where message_id=p_message_id
    and channel_id=p_channel_id order by order_id for update;
  select * into v_notification from public.restaurant_kitchen_notifications
    where order_id=p_order_id for update;
  if not found or v_notification.status is distinct from 'sent' or
    v_notification.created_at is null or v_notification.created_at < p_live_after or v_notification.created_at > now() or
    v_notification.message_id is distinct from p_message_id or
    v_notification.chat_id is distinct from p_chat_id or
    v_notification.channel_id is distinct from p_channel_id then return false; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.order_status::text is distinct from p_expected_status or
    v_order.created_at is null or v_order.created_at < p_live_after or v_order.created_at > now() then return false; end if;
  if not (
    (p_target_status='preparing' and p_expected_status='new') or
    (p_target_status='completed' and p_expected_status in ('new','preparing','ready','out_for_delivery')) or
    (p_target_status='paid' and p_expected_status in ('new','preparing','ready','out_for_delivery','completed','cancelled')) or
    (p_target_status='cancelled' and p_expected_status in ('new','preparing','ready','out_for_delivery','completed'))
  ) then return false; end if;
  -- Atomic statement checks both mapping sources: competing mappings fail closed.
  update public.orders o set order_status=p_target_status::public.order_status
    where o.id=p_order_id and o.order_status::text=p_expected_status and
      (select count(*) from (
        select id from public.orders where kitchen_whapi_message_id=p_message_id
          and kitchen_whapi_chat_id=p_chat_id and kitchen_whapi_channel_id=p_channel_id
        union all
        select order_id from public.restaurant_kitchen_notifications where status='sent'
          and message_id=p_message_id and chat_id=p_chat_id and channel_id=p_channel_id
      ) targets)=1;
  get diagnostics v_count = row_count;
  return v_count=1;
end;
$$;
revoke all on function public.restaurant_apply_kitchen_reaction_v1(bigint,text,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.restaurant_apply_kitchen_reaction_v1(bigint,text,text,text,text,text,timestamptz) to service_role;
commit;

-- Deployment review requirement: existing order target has a unique(message_id,channel_id)
-- index; notifications currently do not. Review duplicates before proposing the same
-- partial unique index for notifications. Advisory locks coordinate only cooperating
-- writers: all future mapping claims must take the same target lock to rule out
-- cross-table concurrent insert phantoms. This proposal does not silently change
-- outbound claim/binding behavior or apply schema constraints. The final status UPDATE
-- checks both sources in its own snapshot and locked mappings cannot change meanwhile.
