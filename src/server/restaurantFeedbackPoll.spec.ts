import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
vi.mock('server-only', () => ({}));
import { createRestaurantFeedbackHandler, runRestaurantFeedbackBatch } from './restaurantFeedbackPoll';
import { processRestaurantOrders, type FeedbackReaction, type OrderWebhookConfig } from './restaurantOrderWebhook';

const now = new Date('2026-11-19T08:30:00Z');
const config: OrderWebhookConfig = { enabled: true, channelId: 'TEST-CHANNEL', liveAfter: '2026-11-18T00:00:00Z', operatorPhones: ['66800000001'] };
const guest = '66800000002@s.whatsapp.net';
const testEnv = {
  RESTAURANT_FEEDBACK_POLL_ENABLED: 'true', RESTAURANT_FEEDBACK_POLL_MODE: 'staff-canary',
  RESTAURANT_FEEDBACK_POLL_CANARY_DM: guest, RESTAURANT_WHAPI_PHONE: '66800000001',
  RESTAURANT_WHAPI_CHANNEL_ID: config.channelId, RESTAURANT_WHAPI_TOKEN: 'SYNTHETIC-ONLY',
  RESTAURANT_FEEDBACK_POLL_LIVE_AFTER: '2026-11-19T08:29:00Z',
  RESTAURANT_ORDER_WEBHOOK_LIVE_AFTER: config.liveAfter,
};
const ref = { messageId: 'guest-message', chatId: guest, channelId: config.channelId };
const feedback = { ref, timestampMs: now.getTime(), eventId: 'feedback-action', actorPhone: '66800000001', fromMe: true };
const event = (overrides = {}) => ({
  id: feedback.eventId, type: 'action', from: '66800000001', source: 'mobile', from_me: true,
  timestamp: now.getTime() / 1000, chat_id: guest, action: { type: 'reaction', target: ref.messageId, emoji: '⭐' }, ...overrides,
});
const payload = (overrides: object, envelope: object = {}) => ({
  channel_id: config.channelId, event: { type: 'messages', event: 'post' }, messages: [event(overrides)], ...envelope,
});
function fixture() {
  const claim = vi.fn().mockResolvedValue({ data: [{ order_id: 123, guest_chat: guest }] });
  const rpc = vi.fn().mockReturnValue({ abortSignal: claim });
  const update = vi.fn(), eq = vi.fn(), select = vi.fn(), abortSignal = vi.fn().mockResolvedValue({ data: [{ order_id: 123 }] });
  const chain = { eq, select, update, abortSignal };
  eq.mockReturnValue(chain); select.mockReturnValue(chain); update.mockReturnValue(chain);
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async input => String(input).includes('/health')
    ? Response.json({ status: { text: 'AUTH' }, channel_id: config.channelId, user: { id: '66800000001' } })
    : Response.json({ message: { id: 'accepted-poll', chat_id: guest } }));
  const client = { rpc, from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
  const run = (r: FeedbackReaction = feedback, env: NodeJS.ProcessEnv = testEnv, clock = () => now.getTime()) =>
    createRestaurantFeedbackHandler(client, env, fetcher, clock)?.(r);
  return { rpc, claim, select, update, fetcher, run };
}

describe('star routing keeps the authorized order webhook boundary', () => {
  it('calls feedback only, never order status or mirroring', async () => {
    const store = { bind: vi.fn(), find: vi.fn(), compareAndSet: vi.fn() };
    const send = vi.fn().mockResolvedValue('feedback_sent');
    await expect(processRestaurantOrders(store, payload({}), config, true, now, send))
      .resolves.toEqual({ httpStatus: 200, outcomes: ['feedback_collected'] });
    expect(send).toHaveBeenCalledWith(feedback);
    expect(store.find).not.toHaveBeenCalled();
    expect(store.compareAndSet).not.toHaveBeenCalled();
  });
  it.each([
    [{ from: '66800000002', from_me: true }, {}, true],
    [{ source: 'api' }, {}, true],
    [{ timestamp: now.getTime() / 1000 - 121 }, {}, true],
    [{ history: true }, {}, true],
    [{ action: { type: 'reaction', target: ref.messageId, emoji: '⭐⭐' } }, {}, true],
    [{ action: { type: 'reaction', target: ref.messageId, emoji: '⭐', timestamp: now.getTime() / 1000 - 1 } }, {}, true],
    [{}, { history: true }, true],
    [{}, { channel_id: 'COCO-ACCOUNT' }, true],
    [{}, {}, false],
  ])('rejects unauthorized, bad, replayed or stale action %#', async (message, envelope, auth) => {
    const store = { bind: vi.fn(), find: vi.fn(), compareAndSet: vi.fn() };
    const send = vi.fn();
    await processRestaurantOrders(store, payload(message, envelope), config, auth, now, send);
    expect(send).not.toHaveBeenCalled();
    expect(store.compareAndSet).not.toHaveBeenCalled();
  });
  it('isolates feedback failure from a following valid status reaction', async () => {
    const store = { bind: vi.fn(), find: vi.fn().mockResolvedValue([{ id: 123, created_at: config.liveAfter, order_status: 'new' }]), compareAndSet: vi.fn().mockResolvedValue(true) };
    const send = vi.fn(() => { throw new Error('private error'); });
    const result = await processRestaurantOrders(store, payload({}, { messages: [event(), event({ action: { type: 'reaction', target: ref.messageId, emoji: '👍' } })] }), config, true, now, send);
    expect(result).toEqual({ httpStatus: 200, outcomes: ['feedback_collection_error', 'order_preparing'] });
  });
});
describe('atomic reservation and fixed native survey payload', () => {
  it('sends a single-selection, five-star poll to the claimed direct chat', async () => {
    const f = fixture(); await expect(f.run()).resolves.toBe('feedback_sent');
    const [url, init] = f.fetcher.mock.calls[1];
    expect(String(url)).toBe('https://gate.whapi.cloud/messages/poll');
    expect(JSON.parse(String(init?.body))).toEqual({ to: guest, title: 'How was your visit to Coconut Beach?', options: ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'], count: 1 });
    expect(f.rpc).toHaveBeenCalledOnce();
    expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent', provider_message_id: 'accepted-poll' }));
  });
  it('does not send for the Kitchen copy or an actor outside the shared Restaurant account', async () => {
    const f = fixture();
    await expect(f.run({ ...feedback, ref: { ...ref, messageId: 'kitchen-message', chatId: '120363000000000000@g.us' } })).resolves.toBe('feedback_wrong_route');
    await expect(f.run({ ...feedback, fromMe: false })).resolves.toBe('feedback_wrong_sender');
    await expect(f.run({ ...feedback, actorPhone: '66800000003' })).resolves.toBe('feedback_wrong_sender');
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it('skips disabled, wrong route, wrong direct lookup, old and duplicate actions', async () => {
    const f = fixture(); expect(f.run(feedback, {})).toBeUndefined();
    await expect(f.run({ ...feedback, ref: { ...ref, chatId: '123@g.us' } })).resolves.toBe('feedback_wrong_route');
    await expect(f.run({ ...feedback, timestampMs: now.getTime() - 65_000 })).resolves.toBe('feedback_before_cutoff_or_stale');
    expect(f.fetcher).not.toHaveBeenCalled();
    f.claim.mockResolvedValueOnce({ data: [{ order_id: 123, guest_chat: '66800000003@s.whatsapp.net' }] });
    await expect(f.run()).resolves.toBe('feedback_claim_unconfirmed');
    f.claim.mockResolvedValueOnce({ data: [] });
    await expect(f.run()).resolves.toBe('feedback_ineligible_or_duplicate');
    expect(f.fetcher.mock.calls.every(([x]) => String(x).includes('/health'))).toBe(true);
  });
  it.each([
    { RESTAURANT_FEEDBACK_POLL_ENABLED: 'false' },
    { RESTAURANT_FEEDBACK_POLL_MODE: undefined },
    { RESTAURANT_FEEDBACK_POLL_MODE: 'all' },
  ])('does not fall back to a global mode with %j', overrides => {
    const f = fixture();
    expect(f.run(feedback, { ...testEnv, ...overrides })).toBeUndefined();
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { RESTAURANT_FEEDBACK_POLL_CANARY_DM: undefined },
    { RESTAURANT_FEEDBACK_POLL_CANARY_DM: '120363000000000000@g.us' },
    { RESTAURANT_FEEDBACK_POLL_CANARY_DM: '66800000001@s.whatsapp.net' },
    { RESTAURANT_FEEDBACK_POLL_CANARY_DM: '66800000002@s.whatsapp.net,66800000003@s.whatsapp.net' },
    { RESTAURANT_FEEDBACK_POLL_LIVE_AFTER: 'not-an-activation-timestamp' },
    { RESTAURANT_WHAPI_PHONE: 'invalid' },
    { RESTAURANT_WHAPI_CHANNEL_ID: 'invalid!' },
  ])('cannot send with invalid explicit canary configuration %j', async overrides => {
    const f = fixture();
    await expect(f.run(feedback, { ...testEnv, ...overrides })).resolves.toBe('feedback_configuration_invalid');
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });
  describe('all-guests mode', () => {
    const otherGuest = '66800000003@s.whatsapp.net';
    const guestEnv = { ...testEnv, RESTAURANT_FEEDBACK_POLL_MODE: 'all-guests', RESTAURANT_FEEDBACK_POLL_CANARY_DM: undefined };
    it('sends to any guest DM the claim RPC confirms, without a canary DM', async () => {
      const f = fixture();
      f.claim.mockResolvedValue({ data: [{ order_id: 123, guest_chat: otherGuest }] });
      f.fetcher.mockImplementation(async input => String(input).includes('/health')
        ? Response.json({ status: { text: 'AUTH' }, channel_id: config.channelId, user: { id: '66800000001' } })
        : Response.json({ message: { id: 'accepted-poll', chat_id: otherGuest } }));
      await expect(f.run({ ...feedback, ref: { ...ref, chatId: otherGuest } }, guestEnv)).resolves.toBe('feedback_sent');
      const send = f.fetcher.mock.calls.find(([x]) => String(x).endsWith('/messages/poll'));
      expect(JSON.parse(String(send?.[1]?.body)).to).toBe(otherGuest);
    });
    it('has no two-hour expiry but still requires a fresh reaction after LIVE_AFTER', async () => {
      const f = fixture();
      const later = now.getTime() + 3 * 24 * 60 * 60 * 1000;
      await expect(f.run({ ...feedback, timestampMs: later }, guestEnv, () => later)).resolves.toBe('feedback_sent');
      await expect(f.run({ ...feedback, timestampMs: later - 121_000 }, guestEnv, () => later)).resolves.toBe('feedback_before_cutoff_or_stale');
      await expect(f.run(feedback, { ...guestEnv, RESTAURANT_FEEDBACK_POLL_LIVE_AFTER: '2026-11-19T08:30:02Z' }))
        .resolves.toBe('feedback_before_cutoff_or_stale');
    });
    it('still refuses a claim whose chat differs from the starred chat', async () => {
      const f = fixture();
      f.claim.mockResolvedValue({ data: [{ order_id: 123, guest_chat: otherGuest }] });
      await expect(f.run(feedback, guestEnv)).resolves.toBe('feedback_claim_unconfirmed');
      expect(f.fetcher.mock.calls.some(([x]) => String(x).endsWith('/messages/poll'))).toBe(false);
    });
    it('still requires the Restaurant account as the sender', async () => {
      const f = fixture();
      await expect(f.run({ ...feedback, actorPhone: '66800000009' }, guestEnv)).resolves.toBe('feedback_wrong_sender');
      await expect(f.run({ ...feedback, fromMe: false }, guestEnv)).resolves.toBe('feedback_wrong_sender');
    });
  });
  it('rejects a live non-allowlisted direct chat before touching provider or database', async () => {
    const f = fixture();
    await expect(f.run({ ...feedback, ref: { ...ref, chatId: '66800000003@s.whatsapp.net' } }))
      .resolves.toBe('feedback_canary_recipient_denied');
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('will not begin early or after the two-hour window even for a fresh reaction', async () => {
    const f = fixture();
    await expect(f.run(feedback, { ...testEnv, RESTAURANT_FEEDBACK_POLL_LIVE_AFTER: '2026-11-19T08:30:02Z' }))
      .resolves.toBe('feedback_before_cutoff_or_stale');
    const later = now.getTime() + 2 * 60 * 60 * 1000;
    await expect(f.run({ ...feedback, timestampMs: later }, testEnv, () => later))
      .resolves.toBe('feedback_before_cutoff_or_stale');
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('rejects a token belonging to another sender before attempting any write', async () => {
    const f = fixture();
    f.fetcher.mockResolvedValueOnce(Response.json({ status: { text: 'AUTH' }, channel_id: config.channelId, user: { id: '66800000003' } }));
    await expect(f.run()).resolves.toBe('feedback_provider_not_verified');
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('holds on unconfirmed claim, and records ambiguous provider results without retry', async () => {
    const f = fixture();
    f.claim.mockResolvedValueOnce({ error: 'timeout' });
    await expect(f.run()).resolves.toBe('feedback_claim_unconfirmed');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    f.fetcher.mockImplementation(async x => {
      if (String(x).includes('/health')) return Response.json({ status: { text: 'AUTH' }, channel_id: config.channelId, user: { id: testEnv.RESTAURANT_WHAPI_PHONE } });
      throw new Error('network timeout');
    });
    await expect(f.run()).resolves.toBe('feedback_uncertain');
    expect(f.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'uncertain', provider_message_id: null }));
    f.claim.mockResolvedValueOnce({ data: [] });
    await expect(f.run()).resolves.toBe('feedback_ineligible_or_duplicate');
    expect(f.fetcher.mock.calls.filter(([x]) => String(x).endsWith('/messages/poll'))).toHaveLength(1);
  });
});

describe('background batch bounds', () => {
  it('caps concurrency, suppresses duplicate IDs, and does not start more work after deadline', async () => {
    const ctrl = new AbortController();
    const starts: Array<{ done: () => void; signal?: AbortSignal }> = [];
    const items = Array.from({ length: 50 }, (_, i) => ({ ...feedback, eventId: String(i) }));
    const handle = vi.fn((_, signal) => new Promise<string>(resolve => {
      starts.push({ done: () => resolve('feedback_uncertain'), signal });
    }));
    const pending = runRestaurantFeedbackBatch([items[0], ...items], handle, ctrl.signal);
    expect(starts).toHaveLength(5);
    expect(starts.every(x => x.signal === ctrl.signal)).toBe(true);
    ctrl.abort();
    starts.forEach(x => x.done());
    await expect(pending).resolves.toEqual({ feedback_uncertain: 5, feedback_batch_deadline: 45 });
    expect(handle).toHaveBeenCalledTimes(5);
  });
});
