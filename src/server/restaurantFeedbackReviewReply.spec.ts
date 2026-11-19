import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
vi.mock('server-only', () => ({}));
import {
  collectRestaurantPollVotes, createRestaurantReviewReplyHandler, REVIEW_REPLY_TEXT, runRestaurantReviewReplyBatch, type PollVote,
} from './restaurantFeedbackReviewReply';

const now = Date.parse('2026-11-19T10:30:00Z');
const channel = 'TEST-CHANNEL';
const guest = '66800000002@s.whatsapp.net';
const env = {
  RESTAURANT_FEEDBACK_REVIEW_REPLY_ENABLED: 'true', RESTAURANT_FEEDBACK_POLL_MODE: 'staff-canary',
  RESTAURANT_FEEDBACK_POLL_CANARY_DM: guest, RESTAURANT_WHAPI_PHONE: '66800000001',
  RESTAURANT_WHAPI_CHANNEL_ID: channel, RESTAURANT_WHAPI_TOKEN: 'SYNTHETIC-ONLY',
};
const vote: PollVote = { pollMessageId: 'poll-1', chatId: guest, eventId: 'vote-1', atMs: now };
const results = (fiveStarVoters: string[], fourStarVoters: string[] = []) => [1, 2, 3, 4, 5].map(n => ({
  id: `hash-${n}`, name: '⭐'.repeat(n), count: 0,
  voters: n === 5 ? fiveStarVoters : n === 4 ? fourStarVoters : [],
}));

function fixture(pollResults = results([guest]), claimRows: unknown[] = [{ order_id: 22988 }]) {
  const claim = vi.fn().mockResolvedValue({ data: claimRows });
  const rpc = vi.fn().mockReturnValue({ abortSignal: claim });
  const update = vi.fn(), eq = vi.fn(), select = vi.fn(), abortSignal = vi.fn().mockResolvedValue({ data: [{ order_id: 22988 }] });
  const chain = { eq, select, update, abortSignal };
  eq.mockReturnValue(chain); select.mockReturnValue(chain); update.mockReturnValue(chain);
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => {
    const url = String(input);
    if (url.includes('/health')) return Response.json({ status: { text: 'AUTH' }, channel_id: channel, user: { id: '66800000001' } });
    if (url.endsWith('/messages/poll-1')) return Response.json({ id: 'poll-1', from_me: true, type: 'poll', chat_id: guest, poll: { results: pollResults } });
    return Response.json({ sent: true, message: { id: 'reply-1', chat_id: guest } });
  });
  const client = { rpc, from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
  const run = (v: PollVote = vote, e: NodeJS.ProcessEnv = env) =>
    createRestaurantReviewReplyHandler(client, e, fetcher, () => now)?.(v, AbortSignal.timeout(5000));
  const sends = () => fetcher.mock.calls.filter(([url]) => String(url).endsWith('/messages/text'));
  return { rpc, update, fetcher, run, sends };
}

describe('collectRestaurantPollVotes', () => {
  const post = (m: object, envelope: object = {}) => ({ channel_id: channel, event: { type: 'messages', event: 'post' },
    messages: [{ id: 'vote-1', type: 'action', from_me: false, from: '66800000002', chat_id: guest, timestamp: now / 1000,
      action: { type: 'vote', target: 'poll-1', votes: ['hash-5'] }, ...m }], ...envelope });
  it('collects a guest vote from a messages POST', () => {
    expect(collectRestaurantPollVotes(post({}), channel)).toEqual([vote]);
  });
  it('collects a vote from a messages PATCH on our poll', () => {
    const payload = { channel_id: channel, event: { type: 'messages', event: 'patch' }, messages_updates: [{
      id: 'poll-1', trigger: { id: 'vote-1', type: 'action', timestamp: now / 1000 },
      after_update: { id: 'poll-1', type: 'poll', from_me: true, chat_id: guest, poll: { results: results([guest]) } }, changes: ['poll'] }] };
    expect(collectRestaurantPollVotes(payload, channel)).toEqual([vote]);
  });
  it.each([
    [{ from_me: true }, {}], [{ is_group: true }, {}], [{ history: true }, {}], [{ from: '66800000009' }, {}],
    [{ chat_id: '120363000000000000@g.us' }, {}], [{ action: { type: 'reaction', target: 'poll-1' } }, {}],
    [{}, { channel_id: 'OTHER' }], [{}, { history: true }],
  ])('ignores non-guest, group, history or non-vote events %#', (m, envelope) => {
    expect(collectRestaurantPollVotes(post(m, envelope), channel)).toEqual([]);
  });
});

describe('review reply handler', () => {
  it('is off unless explicitly enabled', () => {
    expect(createRestaurantReviewReplyHandler({} as SupabaseClient, { ...env, RESTAURANT_FEEDBACK_REVIEW_REPLY_ENABLED: undefined })).toBeUndefined();
  });
  it('sends the exact review message once for a 5-star vote', async () => {
    const f = fixture();
    await expect(f.run()).resolves.toBe('review_sent');
    expect(f.rpc).toHaveBeenCalledWith('restaurant_claim_feedback_review_reply_v1', { p_poll_message: 'poll-1', p_guest_chat: guest, p_channel: channel });
    expect(f.sends()).toHaveLength(1);
    expect(JSON.parse(String(f.sends()[0][1]?.body))).toEqual({ to: guest, body: REVIEW_REPLY_TEXT });
    expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent', provider_message_id: 'reply-1' }));
  });
  it('matches the 5-star option even when written with U+FE0F', async () => {
    const r = results([]); r[4] = { ...r[4], name: '⭐️⭐️⭐️⭐️⭐️', voters: ['66800000002'] };
    await expect(fixture(r).run()).resolves.toBe('review_sent');
  });
  it('does not send for any other rating, or if the vote moved off 5 stars', async () => {
    const f = fixture(results([], [guest]));
    await expect(f.run()).resolves.toBe('review_not_top_rating');
    expect(f.rpc).not.toHaveBeenCalled();
    expect(f.sends()).toHaveLength(0);
  });
  it('does not send twice when the claim already exists', async () => {
    const f = fixture(results([guest]), []);
    await expect(f.run()).resolves.toBe('review_ineligible_or_duplicate');
    expect(f.sends()).toHaveLength(0);
  });
  it('holds replies to the staff canary DM', async () => {
    const f = fixture();
    await expect(f.run({ ...vote, chatId: '66800000003@s.whatsapp.net' })).resolves.toBe('review_canary_recipient_denied');
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('rejects stale votes', async () => {
    const f = fixture();
    await expect(f.run({ ...vote, atMs: now - 11 * 60_000 })).resolves.toBe('review_stale');
    expect(f.sends()).toHaveLength(0);
  });
  it('counts batch outcomes', async () => {
    await expect(runRestaurantReviewReplyBatch([vote], async () => 'review_sent', AbortSignal.timeout(1000)))
      .resolves.toEqual({ review_sent: 1 });
  });
});
