begin;
-- One review-link follow-up per feedback poll (and so per order).
create table public.restaurant_feedback_review_replies (
  order_id bigint primary key references public.restaurant_feedback_poll_attempts(order_id),
  poll_message_id text not null unique,
  claimed_at timestamptz not null default now(),
  status text not null default 'claimed' check (status in ('claimed','sent','failed','uncertain')),
  provider_message_id text,
  finished_at timestamptz,
  check ((status = 'sent') = (provider_message_id is not null)),
  check ((status = 'claimed') = (finished_at is null))
);
alter table public.restaurant_feedback_review_replies enable row level security;
revoke all on public.restaurant_feedback_review_replies from public, anon, authenticated, service_role;
grant select, insert on public.restaurant_feedback_review_replies to service_role;
grant update (status, provider_message_id, finished_at) on public.restaurant_feedback_review_replies to service_role;

-- Claims the single reply only for a poll we actually sent, to the chat the
-- poll went to, within 7 days of sending it.
create function public.restaurant_claim_feedback_review_reply_v1(
  p_poll_message text, p_guest_chat text, p_channel text
) returns table (order_id bigint)
language plpgsql security invoker set search_path = ''
as $$
declare
  poll public.restaurant_feedback_poll_attempts%rowtype;
  guest text;
  claim_id bigint;
begin
  if current_user <> 'service_role' then raise insufficient_privilege; end if;
  if coalesce(length(p_poll_message),0) not between 1 and 250
    or coalesce(p_channel,'') !~ '^[A-Z0-9-]{1,100}$'
    or coalesce(p_guest_chat,'') !~ '^[1-9][0-9]{7,14}@s\.whatsapp\.net$' then return; end if;
  select f.* into poll from public.restaurant_feedback_poll_attempts f
    where f.provider_message_id = p_poll_message and f.channel_id = p_channel and f.status = 'sent';
  if not found or poll.finished_at < now() - interval '7 days' then return; end if;
  select o.kitchen_whapi_chat_id into guest from public.orders o where o.id = poll.order_id;
  if guest is distinct from p_guest_chat then return; end if;
  insert into public.restaurant_feedback_review_replies as r (order_id, poll_message_id)
    values (poll.order_id, p_poll_message) on conflict do nothing returning r.order_id into claim_id;
  if claim_id is not null then return query select claim_id; end if;
end;
$$;
revoke all on function public.restaurant_claim_feedback_review_reply_v1(text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.restaurant_claim_feedback_review_reply_v1(text,text,text) to service_role;
commit;
