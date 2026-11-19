import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { after, NextRequest } from 'next/server';

vi.mock('next/server', async importOriginal => ({
  ...await importOriginal<typeof import('next/server')>(),
  after: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase-server', () => ({ createServiceRoleClient: vi.fn() }));

import { createServiceRoleClient } from '@/lib/supabase-server';
import { POST } from '../../app/api/restaurant/whapi-webhook/route';

const request = (body: unknown, token = 'webhook-token') => new NextRequest(
  'https://menu.coconut.holiday/api/restaurant/whapi-webhook',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Coco-Webhook-Token': token },
    body: JSON.stringify(body),
  },
);

describe('restaurant WHAPI webhook route boundary', () => {
  beforeEach(() => {
    vi.stubEnv('RESTAURANT_WHAPI_CHANNEL_ID', 'restaurant-channel');
    vi.stubEnv('RESTAURANT_WHAPI_TOKEN', 'provider-token');
    vi.stubEnv('WHAPI_WEBHOOK_TOKENS', 'webhook-token');
    vi.mocked(createServiceRoleClient).mockReturnValue({} as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('rejects unauthenticated callbacks before opening the service-role client', async () => {
    const response = await POST(request({}, 'wrong-token'));
    expect(response.status).toBe(401);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('observes authenticated reaction shape while order behavior is disabled without database operations', async () => {
    vi.stubEnv('RESTAURANT_REACTION_OBSERVE', 'true');
    vi.stubEnv('RESTAURANT_ORDER_WEBHOOK_ENABLED', 'false');
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const response = await POST(request({ channel_id: 'restaurant-channel', messages: [{ type: 'reaction', from: '66800000000', id: 'synthetic-only', action: { type: 'reaction', emoji: '👍', target: 'not-an-order' } }] }));
      expect(response.status).toBe(200);
      expect(log).toHaveBeenCalledWith('[restaurant-reaction-shape]', expect.any(String));
      expect(JSON.stringify(log.mock.calls)).not.toContain('66800000000');
      expect(JSON.stringify(log.mock.calls)).not.toContain('synthetic-only');
    } finally { log.mockRestore(); }
  });

  it('does not observe rejected authentication even when observation is enabled', async () => {
    vi.stubEnv('RESTAURANT_REACTION_OBSERVE', 'true');
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const response = await POST(request({ messages: [{ type: 'reaction', action: { type: 'reaction' } }] }, 'wrong-token'));
      expect(response.status).toBe(401);
      expect(log.mock.calls.some(([tag]) => tag === '[restaurant-reaction-shape]')).toBe(false);
      expect(createServiceRoleClient).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });

  it('fails closed when required server configuration is absent', async () => {
    vi.stubEnv('RESTAURANT_WHAPI_TOKEN', '');
    const response = await POST(request({}));
    expect(response.status).toBe(503);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it('acknowledges an authenticated unrelated event without database writes', async () => {
    const response = await POST(request({
      event: { type: 'messages', event: 'patch' },
      channel_id: 'restaurant-channel',
      messages: [],
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('finishes status work and responds before any star provider or poll claim, even for a full mixed batch', async () => {
    vi.stubEnv('RESTAURANT_ORDER_WEBHOOK_ENABLED', 'true');
    vi.stubEnv('RESTAURANT_ORDER_WEBHOOK_LIVE_AFTER', new Date(Date.now() - 50_000).toISOString());
    vi.stubEnv('RESTAURANT_WHAPI_CHANNEL_ID', 'TEST-CHANNEL');
    vi.stubEnv('RESTAURANT_WHAPI_PHONE', '66800000001');
    vi.stubEnv('RESTAURANT_ORDER_OPERATOR_PHONES', '66800000001');
    vi.stubEnv('RESTAURANT_FEEDBACK_POLL_ENABLED', 'true');
    vi.stubEnv('RESTAURANT_FEEDBACK_POLL_MODE', 'staff-canary');
    vi.stubEnv('RESTAURANT_FEEDBACK_POLL_CANARY_DM', '66800000002@s.whatsapp.net');
    vi.stubEnv('RESTAURANT_FEEDBACK_POLL_LIVE_AFTER', new Date(Date.now() - 50_000).toISOString());
    const reactions = Array.from({ length: 50 }, (_, i) => ({
      id: `action-${i}`, type: 'action', from: '66800000001', from_me: true, source: 'mobile',
      timestamp: Math.floor(Date.now() / 1000), chat_id: '66800000002@s.whatsapp.net',
      action: { type: 'reaction', target: 'linked-message', emoji: i === 49 ? '👍' : '⭐' },
    }));
    const update = vi.fn();
    const rpc = vi.fn();
    const resultChain = (data: object[]) => {
      const chain = { select: vi.fn(), eq: vi.fn(), gte: vi.fn(), limit: vi.fn().mockResolvedValue({ data }) };
      chain.select.mockImplementation((field: string) => field === 'id' ? Promise.resolve({ data: [{ id: 123 }] }) : chain);
      chain.eq.mockReturnValue(chain); chain.gte.mockReturnValue(chain);
      return chain;
    };
    const row = { id: 123, created_at: new Date(Date.now() - 20_000).toISOString(), order_status: 'new' };
    update.mockImplementation(() => resultChain([]));
    const from = vi.fn((name: string) => name === 'orders' ? { ...resultChain([row]), update } : resultChain([]));
    vi.mocked(createServiceRoleClient).mockReturnValue({ from, rpc } as never);
    const originalFetch = globalThis.fetch;
    const inFlight: Array<(r: Response) => void> = [];
    const fetcher = vi.fn<typeof fetch>(() => new Promise<Response>(resolve => { inFlight.push(resolve); }));
    vi.stubGlobal('fetch', fetcher);
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const response = await POST(request({ channel_id: 'TEST-CHANNEL', event: { type: 'messages', event: 'post' }, messages: reactions }));
      expect(response.status).toBe(200);
      expect(update).toHaveBeenCalledWith({ order_status: 'preparing' });
      expect(fetcher).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
      expect(after).toHaveBeenCalledTimes(1);

      const callback = vi.mocked(after).mock.calls[0][0] as () => Promise<void>;
      const pending = callback();
      expect(fetcher).toHaveBeenCalledTimes(5);
      expect(update).toHaveBeenCalledTimes(1);
      // Resolve each synthetic failed verification in bounded waves. No send/claim.
      const flush = () => new Promise(resolve => setTimeout(resolve, 0));
      for (let i = 0; i < 10; i++) {
        inFlight.splice(0).forEach(done => done(new Response(null, { status: 503 })));
        await flush();
      }
      await pending;
      expect(fetcher).toHaveBeenCalledTimes(49);
      expect(fetcher.mock.calls.every(([url]) => String(url).endsWith('/health?wakeup=false'))).toBe(true);
      expect(rpc).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal('fetch', originalFetch);
      log.mockRestore();
    }
  });

  it('does not query or send hours content until after the authenticated webhook responds', async () => {
    vi.stubEnv('RESTAURANT_WHAPI_CHANNEL_ID', 'GRNLTR-V67TK');
    vi.stubEnv('RESTAURANT_WHAPI_PHONE', '66631457299');
    vi.stubEnv('RESTAURANT_ORDER_WEBHOOK_ENABLED', 'false');
    vi.stubEnv('RESTAURANT_HOURS_FAQ_ENABLED', 'true');
    vi.stubEnv('RESTAURANT_HOURS_FAQ_SCOPE', 'staff-canary');
    vi.stubEnv('RESTAURANT_HOURS_FAQ_CANARY_CHAT', '66800000002@s.whatsapp.net');
    vi.stubEnv('RESTAURANT_HOURS_FAQ_LIVE_AFTER', new Date(Date.now() - 50_000).toISOString());
    const chain = { select: vi.fn(), eq: vi.fn(), abortSignal: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
    for (const m of [chain.select, chain.eq, chain.abortSignal]) m.mockReturnValue(chain);
    const from = vi.fn().mockReturnValue(chain);
    vi.mocked(createServiceRoleClient).mockReturnValue({ from } as never);
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const response = await POST(request({ channel_id: 'GRNLTR-V67TK', event: { type: 'messages', event: 'post' },
        messages: [{ id: 'synthetic-hours', type: 'text', source: 'mobile', from_me: false, from: '66800000002', chat_id: '66800000002@s.whatsapp.net',
          timestamp: Math.floor(Date.now() / 1000), text: { body: 'What time do you close today?' } }],
      }));
      expect(response.status).toBe(200);
      expect(from).not.toHaveBeenCalled();
      expect(after).toHaveBeenCalledTimes(1);
      await (vi.mocked(after).mock.calls[0][0] as () => Promise<void>)();
      expect(from).toHaveBeenCalledExactlyOnceWith('chatbot_faqs');
      expect(log).toHaveBeenCalledWith('[restaurant-hours-faq]', { hours_faq_not_approved: 1 });
      expect(JSON.stringify(log.mock.calls)).not.toContain('synthetic-hours');
    } finally { log.mockRestore(); }
  });

  it('enforces the actual raw-body cap even without a useful declared length', async () => {
    const oversized = new NextRequest(
      'https://menu.coconut.holiday/api/restaurant/whapi-webhook',
      {
        method: 'POST',
        headers: { 'X-Coco-Webhook-Token': 'webhook-token' },
        body: ' '.repeat(256 * 1024 + 1),
      },
    );
    const response = await POST(oversized);
    expect(response.status).toBe(200);
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });
});
