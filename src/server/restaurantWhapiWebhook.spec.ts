import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  authenticateRestaurantWebhook,
  createSupabaseRestaurantHandshakeStore,
  matchActiveGuestIdentity,
  parseRestaurantHandshakeMessage,
  processRestaurantWhapiPayload,
  type IdentityMatch,
  type RestaurantHandshakeRow,
  type RestaurantHandshakeStore,
} from './restaurantWhapiWebhook';
import { hashRestaurantGuestHandshakeRef } from './restaurantGuestHandshake';

const REF = 'BD7XG-E9SJH';
const CHANNEL = 'restaurant-channel';
const CHAT = '66812345678@s.whatsapp.net';
const config = {
  expectedChannelId: CHANNEL,
  restaurantToken: 'test-provider-token',
  webhookTokens: 'old-webhook-token,new-webhook-token',
};

const message = (overrides: Record<string, unknown> = {}) => ({
  id: 'inbound-message-1',
  type: 'text',
  from_me: false,
  from: CHAT,
  chat_id: CHAT,
  text: { body: `Hi my name is Wangui. Please send me the menu\n\nRef: ${REF}` },
  ...overrides,
});

const payload = (messages: unknown[] = [message()], overrides: Record<string, unknown> = {}) => ({
  event: { type: 'messages', event: 'post' },
  channel_id: CHANNEL,
  messages,
  ...overrides,
});

const row = (overrides: Partial<RestaurantHandshakeRow> = {}): RestaurantHandshakeRow => ({
  id: 'handshake-1',
  ref_hash: hashRestaurantGuestHandshakeRef(REF),
  table_number: '6',
  first_name: 'Wangui',
  status: 'pending',
  match_kind: null,
  phone_e164: null,
  whatsapp_chat_id: null,
  linked_incoming_guest_id: null,
  matched_stay_id: null,
  match_method: null,
  match_confidence: null,
  provider_channel_id: null,
  inbound_message_id: null,
  created_at: '2026-11-02T06:30:00.000Z',
  expires_at: '2026-11-02T07:00:00.000Z',
  completed_at: null,
  reply_sent_at: null,
  reply_delivery_state: 'pending',
  reply_attempted_at: null,
  reply_provider_message_id: null,
  last_error: null,
  ...overrides,
});

class FakeStore implements RestaurantHandshakeStore {
  current: RestaurantHandshakeRow | null;
  resolveResult: IdentityMatch = { incomingGuestId: null, stayId: null, method: 'no_match', confidence: 0 };
  resolveError = false;

  constructor(initial = row()) { this.current = initial; }

  async loadByRefHash(refHash: string) {
    return this.current?.ref_hash === refHash ? { ...this.current } : null;
  }
  async recordError(id: string, code: string) {
    if (this.current?.id === id && this.current.status === 'pending') this.current.last_error = code;
  }
  async expirePending(id: string) {
    if (this.current?.id === id && this.current.status === 'pending') {
      this.current.status = 'expired';
      this.current.last_error = 'expired';
    }
  }
  async completePending(id: string, completion: Parameters<RestaurantHandshakeStore['completePending']>[1]) {
    if (!this.current || this.current.id !== id || this.current.status !== 'pending') return null;
    this.current = {
      ...this.current,
      status: 'completed',
      match_kind: completion.match_kind,
      phone_e164: completion.phone_e164,
      whatsapp_chat_id: completion.chat_id,
      linked_incoming_guest_id: completion.linked_incoming_guest_id,
      matched_stay_id: completion.matched_stay_id,
      match_method: completion.match_method,
      match_confidence: completion.match_confidence,
      provider_channel_id: completion.channel_id,
      inbound_message_id: completion.message_id,
      completed_at: completion.completed_at,
      reply_delivery_state: 'pending',
    };
    return { ...this.current };
  }
  async claimReply(id: string, attemptedAt: string) {
    if (!this.current || this.current.id !== id || this.current.reply_delivery_state !== 'pending') return false;
    this.current.reply_delivery_state = 'sending';
    this.current.reply_attempted_at = attemptedAt;
    return true;
  }
  async markReplySent(id: string, providerMessageId: string, sentAt: string) {
    if (!this.current || this.current.id !== id || this.current.reply_delivery_state !== 'sending') return false;
    this.current.reply_delivery_state = 'sent';
    this.current.reply_provider_message_id = providerMessageId;
    this.current.reply_sent_at = sentAt;
    return true;
  }
  async markReplyUncertain(id: string) {
    if (this.current?.id === id && this.current.reply_delivery_state === 'sending') {
      this.current.reply_delivery_state = 'uncertain';
      this.current.last_error = 'reply_send_uncertain';
    }
  }
  async resolveIdentity() {
    if (this.resolveError) throw new Error('synthetic database failure');
    return this.resolveResult;
  }
  async upsertDurableLink() {}
}

describe('restaurant WHAPI webhook authentication and parsing', () => {
  it('accepts only an exact configured rotation token', () => {
    expect(authenticateRestaurantWebhook('new-webhook-token', config.webhookTokens)).toBe(true);
    expect(authenticateRestaurantWebhook('new-webhook-token-x', config.webhookTokens)).toBe(false);
    expect(authenticateRestaurantWebhook('', config.webhookTokens)).toBe(false);
  });

  it('parses only inbound direct canonical text with matching sender and one ref', () => {
    expect(parseRestaurantHandshakeMessage(message())).toMatchObject({
      ref: REF,
      firstName: 'Wangui',
      messageId: 'inbound-message-1',
      chatId: CHAT,
      phoneE164: '+66812345678',
    });
    expect(parseRestaurantHandshakeMessage(message({ from_me: true }))).toBeNull();
    expect(parseRestaurantHandshakeMessage(message({ type: 'image' }))).toBeNull();
    expect(parseRestaurantHandshakeMessage(message({ chat_id: '1203@g.us' }))).toBeNull();
    expect(parseRestaurantHandshakeMessage(message({ from: '66999999999@s.whatsapp.net' }))).toBeNull();
    expect(parseRestaurantHandshakeMessage(message({ from: '123456789@lid' }))).toBeNull();
    expect(parseRestaurantHandshakeMessage(message({
      text: { body: `Hi my name is Wangui. Please send me the menu\nRef: ${REF}\nRef: ${REF}` },
    }))).toBeNull();
  });
});

describe('restaurant identity matching', () => {
  it('requires a unique strong phone or name-country match', () => {
    expect(matchActiveGuestIdentity('Matteo', '+4917661952319', [{
      id: 'guest-1', stay_id: 'NH_DUSSEL', first_name: 'Julius Matteo', phone_e164: null,
      nationality_alpha3: 'DEU', updated_at: '2026-11-02T00:00:00Z',
    }])).toMatchObject({ stayId: 'NH_DUSSEL', method: 'exact_first_name_and_phone_country', confidence: 0.96 });

    expect(matchActiveGuestIdentity('Alex', '+491111111111', [
      { id: '1', stay_id: 'A', first_name: 'Alex', phone_e164: null, nationality_alpha3: 'DEU', updated_at: null },
      { id: '2', stay_id: 'B', first_name: 'Alex', phone_e164: null, nationality_alpha3: 'DEU', updated_at: null },
    ])).toMatchObject({ stayId: null, method: 'ambiguous_or_weak' });
  });
});

describe('restaurant WHAPI webhook processing', () => {
  const now = new Date('2026-11-02T06:45:00.000Z');

  it('atomically completes and acknowledges one menu reply, then deduplicates replay', async () => {
    const store = new FakeStore();
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ message: { id: 'outbound-1' } }) }));

    const first = await processRestaurantWhapiPayload(store, payload(), config, { now, fetchImpl });
    expect(first).toEqual({ httpStatus: 200, outcomes: ['completed_reply_sent'] });
    expect(store.current).toMatchObject({
      status: 'completed', phone_e164: '+66812345678', whatsapp_chat_id: CHAT,
      inbound_message_id: 'inbound-message-1', reply_delivery_state: 'sent',
      reply_provider_message_id: 'outbound-1',
    });
    const sentBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(sentBody).toMatchObject({ to: CHAT, chat_id: CHAT, channel_id: CHANNEL });
    expect(sentBody.body).toContain('https://menu.coconut.holiday/register/unknown?');
    expect(sentBody.body).toContain(`handshake=${REF}`);

    const replay = await processRestaurantWhapiPayload(store, payload(), config, { now, fetchImpl });
    expect(replay.outcomes).toEqual(['already_completed']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('preserves an uncertain provider result and never automatically resends it', async () => {
    const store = new FakeStore();
    const fetchImpl = vi.fn(async () => { throw new Error('connection reset'); });
    const first = await processRestaurantWhapiPayload(store, payload(), config, { now, fetchImpl });
    expect(first).toEqual({ httpStatus: 200, outcomes: ['completed_reply_uncertain'] });
    expect(store.current).toMatchObject({ reply_delivery_state: 'uncertain', last_error: 'reply_send_uncertain' });

    const replay = await processRestaurantWhapiPayload(store, payload(), config, { now, fetchImpl });
    expect(replay.outcomes).toEqual(['already_completed']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not complete an expired request or send a reply', async () => {
    const store = new FakeStore(row({ expires_at: '2026-11-02T06:31:00.000Z' }));
    const fetchImpl = vi.fn();
    const result = await processRestaurantWhapiPayload(store, payload(), config, { now, fetchImpl });
    expect(result.outcomes).toEqual(['expired']);
    expect(store.current?.status).toBe('expired');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ignores wrong channels and unrelated events without touching state', async () => {
    const store = new FakeStore();
    const fetchImpl = vi.fn();
    expect((await processRestaurantWhapiPayload(store, payload([], { channel_id: 'coco-channel' }), config, { now, fetchImpl })).outcomes).toEqual(['ignored']);
    expect((await processRestaurantWhapiPayload(store, payload([], { event: { type: 'messages', event: 'patch' } }), config, { now, fetchImpl })).outcomes).toEqual(['ignored']);
    expect(store.current?.status).toBe('pending');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('asks WHAPI to retry when durable identity lookup is unavailable', async () => {
    const store = new FakeStore();
    store.resolveError = true;
    const result = await processRestaurantWhapiPayload(store, payload(), config, { now, fetchImpl: vi.fn() });
    expect(result).toEqual({ httpStatus: 503, outcomes: ['persistence_error'] });
    expect(store.current?.status).toBe('pending');
  });

  it('will not let a different inbound identity consume an unsent completed row', async () => {
    const store = new FakeStore(row({
      status: 'completed', phone_e164: '+66812345678', whatsapp_chat_id: CHAT,
      provider_channel_id: CHANNEL, inbound_message_id: 'inbound-message-1',
      completed_at: '2026-11-02T06:40:00.000Z', reply_delivery_state: 'pending',
    }));
    const fetchImpl = vi.fn();
    const result = await processRestaurantWhapiPayload(store, payload([
      message({ id: 'attacker-message', from: '66999999999@s.whatsapp.net', chat_id: '66999999999@s.whatsapp.net' }),
    ]), config, { now, fetchImpl });
    expect(result.outcomes).toEqual(['already_completed']);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('Supabase restaurant handshake adapter', () => {
  it('enforces expiry inside the atomic pending-to-completed update', async () => {
    const calls: unknown[][] = [];
    const query = {
      update(value: unknown) { calls.push(['update', value]); return this; },
      eq(field: string, value: unknown) { calls.push(['eq', field, value]); return this; },
      is(field: string, value: unknown) { calls.push(['is', field, value]); return this; },
      gt(field: string, value: unknown) { calls.push(['gt', field, value]); return this; },
      select(value: string) { calls.push(['select', value]); return this; },
      async maybeSingle() { return { data: null, error: null }; },
    };
    const client = { from: vi.fn(() => query) };
    const store = createSupabaseRestaurantHandshakeStore(client as never);
    const completedAt = '2026-11-02T06:45:00.000Z';
    await store.completePending('handshake-1', {
      phone_e164: '+66812345678', chat_id: CHAT, channel_id: CHANNEL,
      message_id: 'inbound-message-1', match_kind: 'walkin',
      linked_incoming_guest_id: null, matched_stay_id: null,
      match_method: 'no_strong_active_stay_match', match_confidence: 0, completed_at: completedAt,
    });
    expect(calls).toContainEqual(['eq', 'status', 'pending']);
    expect(calls).toContainEqual(['is', 'completed_at', null]);
    expect(calls).toContainEqual(['gt', 'expires_at', completedAt]);
  });
});
