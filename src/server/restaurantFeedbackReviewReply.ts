import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FEEDBACK_POLL_OPTIONS } from './restaurantFeedbackPoll';

// A guest who picks the top option on our feedback poll gets one follow-up
// message with the Google review link. One reply per order, never retried.
const origin = 'https://gate.whapi.cloud';
export const REVIEW_REPLY_OPTION = FEEDBACK_POLL_OPTIONS[4];
export const REVIEW_REPLY_TEXT = 'Amazing, thank you so much 🙏\n'
  + 'Do you have 10 seconds? We would ❤️ to see your 5 stars and any photos 📷\n'
  + 'on our Google map page 👉 https://g.page/r/CYRc5Z1q0Lc8EBM/review';
const DM = /^([1-9]\d{7,14})@s\.whatsapp\.net$/;
const ID = /^[A-Za-z0-9._-]{1,250}$/;
const MAX_VOTE_AGE_MS = 10 * 60 * 1000;
const asObj = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const str = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const isHistory = (o: Record<string, unknown>) => o.history === true || o.is_history === true;
const seconds = (v: unknown) => typeof v === 'number' ? v : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
// WhatsApp clients may add U+FE0F (emoji presentation) to ⭐; compare without it.
const sameOption = (a: unknown, b: string) => str(a).replace(/️/g, '') === b.replace(/️/g, '');
const phoneOf = (v: unknown) => {
  const s = str(v);
  return DM.exec(s)?.[1] ?? /^([1-9]\d{7,14})(?:@c\.us)?$/.exec(s)?.[1] ?? '';
};

export type PollVote = { pollMessageId: string; chatId: string; eventId: string; atMs: number | null };

/**
 * Collects guest votes on polls in direct chats. Whapi delivers votes either as
 * a `messages` POST with `type: 'action', action.type: 'vote'`, or as a
 * `messages` PATCH on the poll message. Which option was picked is NOT decided
 * here: the handler re-reads the poll from Whapi and checks the voter list.
 */
export function collectRestaurantPollVotes(payload: unknown, channelId: string): PollVote[] {
  const p = asObj(payload), event = asObj(p.event);
  if (!channelId || p.channel_id !== channelId || isHistory(p) || isHistory(event) || event.type !== 'messages') return [];
  const found = new Map<string, PollVote>();
  const add = (vote: PollVote) => {
    const key = `${vote.pollMessageId}|${vote.chatId}`;
    if (!found.has(key)) found.set(key, vote);
  };
  if (event.event === 'post' && Array.isArray(p.messages) && p.messages.length <= 50) {
    for (const raw of p.messages) {
      const m = asObj(raw), a = asObj(m.action);
      if (m.type !== 'action' || a.type !== 'vote' || m.from_me !== false || isHistory(m) || m.is_group === true) continue;
      if (m.channel_id !== undefined && m.channel_id !== channelId) continue;
      const chatId = str(m.chat_id), phone = DM.exec(chatId)?.[1];
      const pollMessageId = str(a.target), eventId = str(m.id);
      if (!phone || !ID.test(pollMessageId) || !ID.test(eventId)) continue;
      if (m.from !== undefined && phoneOf(m.from) !== phone) continue;
      const at = seconds(a.timestamp ?? m.timestamp) * 1000;
      add({ pollMessageId, chatId, eventId, atMs: Number.isFinite(at) && at > 0 ? at : null });
    }
  } else if (event.event === 'patch' && Array.isArray(p.messages_updates) && p.messages_updates.length <= 50) {
    for (const raw of p.messages_updates) {
      const u = asObj(raw), after = asObj(u.after_update), trigger = asObj(u.trigger);
      if ([u, after, trigger].some(isHistory) || after.type !== 'poll' || after.from_me !== true) continue;
      if (u.channel_id !== undefined && u.channel_id !== channelId) continue;
      const pollMessageId = str(u.id) || str(after.id), chatId = str(after.chat_id) || str(u.chat_id);
      if (!DM.test(chatId) || !ID.test(pollMessageId)) continue;
      const eventId = str(trigger.id) || pollMessageId;
      const at = seconds(trigger.timestamp) * 1000;
      add({ pollMessageId, chatId, eventId: ID.test(eventId) ? eventId : pollMessageId, atMs: Number.isFinite(at) && at > 0 ? at : null });
    }
  }
  return [...found.values()];
}

type Handler = (vote: PollVote, budget: AbortSignal) => Promise<string>;

export async function runRestaurantReviewReplyBatch(votes: readonly PollVote[], handle: Handler, budget: AbortSignal): Promise<Record<string, number>> {
  const codes: Record<string, number> = {};
  let next = 0;
  const run = async () => {
    while (next < votes.length && !budget.aborted) {
      let code = 'review_unconfirmed';
      try { code = await handle(votes[next++], budget); } catch { /* counted below */ }
      codes[code] = (codes[code] ?? 0) + 1;
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, votes.length) }, run));
  if (next < votes.length) codes.review_deadline = votes.length - next;
  return codes;
}

export function createRestaurantReviewReplyHandler(
  client: SupabaseClient, env: NodeJS.ProcessEnv, fetcher: typeof fetch = fetch, clock: () => number = Date.now,
): Handler | undefined {
  if (env.RESTAURANT_FEEDBACK_REVIEW_REPLY_ENABLED !== 'true') return undefined;
  const token = str(env.RESTAURANT_WHAPI_TOKEN);
  const channel = str(env.RESTAURANT_WHAPI_CHANNEL_ID);
  const phone = str(env.RESTAURANT_WHAPI_PHONE);
  // Polls only go to the staff canary DM today, so replies are held to it too.
  // Widening this needs the same reviewed change as widening the poll.
  const destination = str(env.RESTAURANT_FEEDBACK_POLL_CANARY_DM);
  if (!token || !/^[A-Z0-9-]+$/.test(channel) || !/^[1-9]\d{7,14}$/.test(phone)
      || env.RESTAURANT_FEEDBACK_POLL_MODE !== 'staff-canary'
      || !DM.test(destination) || destination === `${phone}@s.whatsapp.net`) return async () => 'review_configuration_invalid';

  const signal = (budget: AbortSignal) => AbortSignal.any([budget, AbortSignal.timeout(5000)]);
  const call = (path: string, budget: AbortSignal, init: RequestInit = {}) => fetcher(origin + path, {
    ...init, redirect: 'error', signal: signal(budget),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  return async ({ pollMessageId, chatId, atMs }, budget) => {
    const guestPhone = DM.exec(chatId)?.[1];
    if (!guestPhone || guestPhone === phone || !ID.test(pollMessageId)) return 'review_bad_reference';
    if (chatId !== destination) return 'review_canary_recipient_denied';
    const now = clock();
    if (atMs !== null && (atMs < now - MAX_VOTE_AGE_MS || atMs > now + 5_000)) return 'review_stale';

    try {
      const res = await call('/health?wakeup=false', budget);
      if (!res.ok) return 'review_provider_not_verified';
      const data = asObj(await res.json());
      const self = str(asObj(data.user).id);
      if (asObj(data.status).text !== 'AUTH' || data.channel_id !== channel
          || (self !== phone && self !== `${phone}@s.whatsapp.net`)) return 'review_provider_not_verified';
    } catch { return 'review_provider_not_verified'; }

    // Source of truth for the vote: the poll as Whapi has it now. A guest who
    // switched away from 5 stars before we read it gets nothing.
    try {
      const res = await call(`/messages/${encodeURIComponent(pollMessageId)}`, budget);
      if (!res.ok) return 'review_poll_unreadable';
      const body = asObj(await res.json());
      const msg = asObj(body.message).id ? asObj(body.message) : body;
      if (str(msg.id) !== pollMessageId || msg.from_me !== true || msg.type !== 'poll'
          || (msg.chat_id !== undefined && str(msg.chat_id) !== chatId)) return 'review_poll_mismatch';
      const results = asObj(msg.poll).results;
      if (!Array.isArray(results)) return 'review_poll_unreadable';
      const top = results.map(asObj).find(r => sameOption(r.name, REVIEW_REPLY_OPTION));
      const voters = Array.isArray(top?.voters) ? top.voters : [];
      if (!voters.some(v => phoneOf(v) === guestPhone)) return 'review_not_top_rating';
    } catch { return 'review_poll_unreadable'; }

    const claim = await client.rpc('restaurant_claim_feedback_review_reply_v1', {
      p_poll_message: pollMessageId, p_guest_chat: chatId, p_channel: channel,
    }).abortSignal(signal(budget));
    if (claim.error) return 'review_claim_unconfirmed';
    if (!Array.isArray(claim.data) || claim.data.length === 0) return 'review_ineligible_or_duplicate';
    const orderId = Number(asObj(claim.data[0]).order_id);
    if (claim.data.length !== 1 || !Number.isSafeInteger(orderId) || orderId <= 0) return 'review_claim_unconfirmed';

    let status = 'uncertain';
    let providerId: string | null = null;
    try {
      const res = await call('/messages/text', budget, {
        method: 'POST', body: JSON.stringify({ to: chatId, body: REVIEW_REPLY_TEXT }),
      });
      if (res.ok) {
        const data = asObj(await res.json()), message = asObj(data.message);
        const accepted = str(message.id) || str(data.id);
        const recipient = str(message.chat_id) || str(data.chat_id);
        if (data.sent !== false && !data.error && ID.test(accepted) && (!recipient || recipient === chatId)) {
          status = 'sent'; providerId = accepted;
        }
      } else if ([400, 401, 402, 403, 404, 422, 429].includes(res.status)) status = 'failed';
    } catch { /* A claimed send is never retried. */ }

    const finalized = await client.from('restaurant_feedback_review_replies')
      .update({ status, provider_message_id: providerId, finished_at: new Date(clock()).toISOString() })
      .eq('order_id', orderId).eq('status', 'claimed').select('order_id').abortSignal(signal(budget));
    return !finalized.error && finalized.data?.length === 1 ? `review_${status}` : 'review_finalization_unconfirmed';
  };
}
