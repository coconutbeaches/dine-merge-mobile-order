import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FeedbackReaction } from './restaurantOrderWebhook';

const origin = 'https://gate.whapi.cloud';
const title = 'How was your visit to Coconut Beach?';
const options = Array.from({ length: 5 }, (_, i) => '⭐'.repeat(i + 1));
export const FEEDBACK_POLL_OPTIONS: readonly string[] = options;
const dm = /^[1-9]\d{7,14}@s\.whatsapp\.net$/;
const asObj = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const str = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const canaryUtc = (cutoff: string) => {
  const parsed = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(cutoff) ? Date.parse(cutoff) : NaN;
  const canonical = cutoff.includes('.') ? cutoff : cutoff.replace(/Z$/, '.000Z');
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === canonical ? parsed : NaN;
};
const utc = (value: string) => /T.+Z$/.test(value) ? Date.parse(value) : NaN;

type FeedbackHandler = (reaction: FeedbackReaction, signal?: AbortSignal) => Promise<string>;
const MAX_FEEDBACK_CONCURRENCY = 5;
const FEEDBACK_BATCH_BUDGET_MS = 20_000;
const CANARY_WINDOW_MS = 2 * 60 * 60 * 1000;

export async function runRestaurantFeedbackBatch(
  reactions: readonly FeedbackReaction[], handle: FeedbackHandler, signal = AbortSignal.timeout(FEEDBACK_BATCH_BUDGET_MS),
): Promise<Record<string, number>> {
  const outcomes: Record<string, number> = {};
  const count = (code: string) => { outcomes[code] = (outcomes[code] ?? 0) + 1; };
  // The callback parser already bounds batches. Suppress exact duplicate IDs
  // early; the database still owns deduplication across requests.
  const byId = new Map<string, FeedbackReaction | null>();
  for (const reaction of reactions) {
    const prev = byId.get(reaction.eventId);
    if (prev === undefined) byId.set(reaction.eventId, reaction);
    else if (prev && (prev.ref.messageId !== reaction.ref.messageId || prev.ref.chatId !== reaction.ref.chatId
        || prev.actorPhone !== reaction.actorPhone || prev.fromMe !== reaction.fromMe
        || prev.timestampMs !== reaction.timestampMs)) byId.set(reaction.eventId, null);
  }
  const unique = [...byId.values()].filter(reaction => reaction !== null);
  let next = 0;
  const worker = async () => {
    while (next < unique.length && !signal.aborted) {
      const reaction = unique[next++];
      try { count(await handle(reaction, signal)); }
      catch { count('feedback_unconfirmed'); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_FEEDBACK_CONCURRENCY, unique.length) }, worker));
  if (next < unique.length) outcomes.feedback_batch_deadline = unique.length - next;
  return outcomes;
}

export function createRestaurantFeedbackHandler(
  client: SupabaseClient, env: NodeJS.ProcessEnv, fetcher: typeof fetch = fetch, clock: () => number = Date.now,
): FeedbackHandler | undefined {
  // This deployment has no unrestricted mode. Partial or mistyped canary
  // configuration must not fall back to dispatching to production guests.
  if (env.RESTAURANT_FEEDBACK_POLL_ENABLED !== 'true'
      || env.RESTAURANT_FEEDBACK_POLL_MODE !== 'staff-canary') return undefined;
  const token = str(env.RESTAURANT_WHAPI_TOKEN);
  const channel = str(env.RESTAURANT_WHAPI_CHANNEL_ID);
  const phone = str(env.RESTAURANT_WHAPI_PHONE);
  const liveAfter = str(env.RESTAURANT_FEEDBACK_POLL_LIVE_AFTER);
  const destination = str(env.RESTAURANT_FEEDBACK_POLL_CANARY_DM);
  const startsAt = canaryUtc(liveAfter);
  const orderCutoff = str(env.RESTAURANT_ORDER_WEBHOOK_LIVE_AFTER);
  if (!token || !/^[A-Z0-9-]+$/.test(channel) || !/^[1-9]\d{7,14}$/.test(phone)
      || !dm.test(destination) || destination === `${phone}@s.whatsapp.net`
      || !Number.isFinite(startsAt)
      || !Number.isFinite(utc(orderCutoff))) return async () => 'feedback_configuration_invalid';

  const timedSignal = (budget?: AbortSignal) => budget
    ? AbortSignal.any([budget, AbortSignal.timeout(5000)])
    : AbortSignal.timeout(5000);
  const call = (path: string, budget?: AbortSignal, init?: RequestInit) => fetcher(origin + path, {
    ...init, redirect: 'error', signal: timedSignal(budget),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return async ({ ref, timestampMs, eventId, actorPhone, fromMe }, budget) => {
    if (!fromMe || actorPhone !== phone) return 'feedback_wrong_sender';
    if (ref.channelId !== channel || !dm.test(ref.chatId)
        || ref.chatId === `${phone}@s.whatsapp.net`) return 'feedback_wrong_route';
    if (ref.chatId !== destination) return 'feedback_canary_recipient_denied';
    const fresh = () => {
      const now = clock();
      return !budget?.aborted && Number.isFinite(timestampMs) && now >= startsAt && now < startsAt + CANARY_WINDOW_MS
        && timestampMs >= startsAt && timestampMs < startsAt + CANARY_WINDOW_MS && timestampMs >= now - 120_000 && timestampMs <= now + 5_000;
    };
    if (!fresh()) return 'feedback_before_cutoff_or_stale';

    // Validate the exact configured Restaurant sender, not merely a token name.
    try {
      const res = await call('/health?wakeup=false', budget);
      if (!res.ok) return 'feedback_provider_not_verified';
      const data = asObj(await res.json());
      const self = str(asObj(data.user).id);
      if (asObj(data.status).text !== 'AUTH' || data.channel_id !== channel
          || (self !== phone && self !== `${phone}@s.whatsapp.net`)) return 'feedback_provider_not_verified';
    } catch { return 'feedback_provider_not_verified'; }

    if (!fresh()) return 'feedback_before_cutoff_or_stale';
    const claim = await client.rpc('restaurant_claim_feedback_poll_v1', {
      p_target_message: ref.messageId, p_target_chat: ref.chatId, p_channel: channel,
      p_restaurant_phone: phone, p_event_id: eventId,
      p_event_at: new Date(timestampMs).toISOString(), p_live_after: liveAfter, p_order_cutoff: orderCutoff,
    }).abortSignal(timedSignal(budget));
    if (claim.error) return 'feedback_claim_unconfirmed';
    if (!Array.isArray(claim.data) || claim.data.length === 0) return 'feedback_ineligible_or_duplicate';
    if (claim.data.length !== 1) return 'feedback_claim_unconfirmed';
    const row = asObj(claim.data[0]);
    const guest = str(row.guest_chat);
    const orderId = Number(row.order_id);
    if (!dm.test(guest) || guest === `${phone}@s.whatsapp.net`
        || guest !== ref.chatId || guest !== destination
        || !Number.isSafeInteger(orderId) || orderId <= 0) return 'feedback_claim_unconfirmed';

    // A persistent claim now owns the only send attempt. Never retry after
    // any attempted POST, ambiguous transport, or unconfirmed finalization.
    let status = 'uncertain';
    let providerId: string | null = null;
    if (!fresh()) status = 'expired';
    else {
      try {
        const res = await call('/messages/poll', budget, {
          method: 'POST',
          body: JSON.stringify({ to: guest, title, options, count: 1 }),
        });
        if (res.ok) {
          const data = asObj(await res.json());
          const message = asObj(data.message);
          const acceptedId = str(message.id) || str(data.id);
          const responseChat = str(message.chat_id) || str(data.chat_id);
          if (data.sent !== false && !data.error && /^[A-Za-z0-9._-]{1,250}$/.test(acceptedId)
              && (!responseChat || responseChat === guest)) {
            providerId = acceptedId;
            status = 'sent';
          }
        } else if ([400, 401, 402, 403, 404, 422, 429].includes(res.status)) status = 'failed';
      } catch { /* Do not retry an ambiguous delivery. */ }
    }
    const finalized = await client.from('restaurant_feedback_poll_attempts')
      .update({ status, provider_message_id: providerId, finished_at: new Date(clock()).toISOString() })
      .eq('order_id', orderId).eq('channel_id', channel).eq('source_event_id', eventId)
      .eq('status', 'claimed').select('order_id').abortSignal(timedSignal(budget));
    return !finalized.error && finalized.data?.length === 1 ? `feedback_${status}` : 'feedback_finalization_unconfirmed';
  };
}
