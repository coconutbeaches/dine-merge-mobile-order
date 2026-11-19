import { createHmac } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { processRestaurantOrders, orderWebhookConfig, type OrderWebhookStore, type OrderWebhookConfig, type OrderRow, type OrderRef } from './restaurantOrderWebhook';
const now = new Date('2026-11-18T04:00:00Z');
const time = now.getTime() / 1000;
const operator = '66800000001';
const secret = 'synthetic-test-signing-secret-32-bytes-only';
const signed = (n: number) => { const body = Buffer.from(String(n)).toString('base64url'); return `v1.${body}.${createHmac('sha256', secret).update(`v1.${body}`).digest('base64url')}`; };
const config: OrderWebhookConfig = { enabled: true, channelId: 'GRNLTR-V67TK', liveAfter: '2026-11-18T03:59:00Z', operatorPhones: [operator], signingSecret: secret };
const ref = { messageId: 'original', chatId: '49123456789@s.whatsapp.net', channelId: config.channelId };
const row = (): OrderRow => ({ id: 42, created_at: '2026-11-18T03:59:30Z', order_status: 'new', kitchen_whapi_message_id: ref.messageId, kitchen_whapi_chat_id: ref.chatId, kitchen_whapi_channel_id: ref.channelId });
function setup() {
  let rows = [row()];
  const store: OrderWebhookStore = {
    bind: vi.fn(async () => 'bound'),
    find: vi.fn(async (r: OrderRef) => rows.filter(x => x.kitchen_whapi_message_id === r.messageId && x.kitchen_whapi_chat_id === r.chatId && x.kitchen_whapi_channel_id === r.channelId).map(x => ({ ...x }))),
    compareAndSet: vi.fn(async (old, r, target) => {
      const current = rows.find(x => x.id === old.id);
      if (!current || current.order_status !== old.order_status) return false;
      current.order_status = target; return true;
    }),
  };
  return { store, get rows() { return rows; }, set rows(r: OrderRow[]) { rows = r; } };
}
const action = (emoji = '👍', overrides = {}) => ({ id: 'action1', type: 'action', from: operator, from_me: true, source: 'mobile', timestamp: time, chat_id: ref.chatId, action: { type: 'reaction', target: ref.messageId, emoji }, ...overrides });
const post = (...messages: unknown[]) => ({ channel_id: config.channelId, event: { type: 'messages', event: 'post' }, messages });
const order = (overrides = {}) => ({ id: 'orderMessage', type: 'text', from_me: false, from: '49123456789', chat_id: ref.chatId, timestamp: time, text: { body: `*Order: #42*\n*Items:*\n1 Rice\n*Total:* THB 100\nRef: ${signed(42)}` }, ...overrides });
const run = (s: ReturnType<typeof setup>, payload: unknown, c = config, auth = true) => processRestaurantOrders(s.store, payload, c, auth, now);

describe('default-off authenticated restaurant-only boundary', () => {
  it('defaults off with no inferred operators or cash authority', async () => {
    expect(orderWebhookConfig({})).toEqual({ enabled: false, channelId: '', liveAfter: '', operatorPhones: [], signingSecret: undefined });
    const s = setup(); await run(s, post(action()), { ...config, enabled: false }); expect(s.store.find).not.toHaveBeenCalled();
  });
  it.each([['auth', false], ['channel', true], ['history', true]])('rejects %s before reading orders', async (kind, auth) => {
    const s = setup(), p = post(action());
    if (kind === 'channel') p.channel_id = 'guest-channel';
    await run(s, kind === 'history' ? { ...p, history: true } : p, config, auth);
    expect(s.store.find).not.toHaveBeenCalled();
  });
  it.each(['', 'invalid'])('requires valid activation cutoff %s', async liveAfter => {
    const s = setup(); await run(s, post(action()), { ...config, liveAfter }); expect(s.store.find).not.toHaveBeenCalled();
  });
  it('requires explicit operators', async () => {
    const s = setup(); await run(s, post(action()), { ...config, operatorPhones: [] }); expect(s.store.find).not.toHaveBeenCalled();
  });
  it.each([undefined, time - 180, time + 60, time * 1000])('rejects missing/stale/future/millisecond timestamp %s', async timestamp => {
    const s = setup(); await run(s, post(action('👍', { timestamp }))); expect(s.store.find).not.toHaveBeenCalled();
  });
});
describe('exact immutable order binding', () => {
  it('binds authenticated fresh canonical inbound order only', async () => {
    const s = setup(); await run(s, post(order())); expect(s.store.bind).toHaveBeenCalledWith(42, { ...ref, messageId: 'orderMessage' }, config.liveAfter);
  });
  it('rejects unsigned, forged, wrong-order and missing-key binding', async () => {
    for (const body of [
      '*Order: #42*\n*Items:*\nRice\n*Total:* THB 100',
      `*Order: #42*\n*Items:*\nRice\n*Total:* THB 100\nRef: ${signed(43)}`,
      `*Order: #42*\n*Items:*\nRice\n*Total:* THB 100\nRef: ${signed(42)}bad`,
    ]) {
      const s = setup(); await run(s, post(order({ text: { body } }))); expect(s.store.bind).not.toHaveBeenCalled();
    }
    const s = setup(); await run(s, post(order()), { ...config, signingSecret: undefined }); expect(s.store.bind).not.toHaveBeenCalled();
  });
  it.each([
    { from_me: true }, { from: '998877@lid' }, { from: '49123456780' }, { timestamp: time - 500 },
    { text: { body: '*Order: #42*\n*Items:*\nRice\n*Total:* THB 100\nRef: invalid' } },
    { text: { body: 'please change order 42' } }, { channel_id: 'guest-channel' },
  ])('does not bind ambiguous or stale input %j', async overrides => {
    const s = setup(); await run(s, post(order(overrides))); expect(s.store.bind).not.toHaveBeenCalled();
  });
});
describe('operator status transitions and safe retries', () => {
  it.each(['guest', 'kitchen'] as const)('rejects fresh reactions on old/missing/invalid/future %s target orders', async targetKind => {
    for (const created_at of ['2026-11-17T12:00:00Z', null, 'invalid', '2026-11-18T04:00:01Z']) {
      const s = setup(); s.rows = [{ ...row(), targetKind, created_at }];
      expect((await run(s, post(action('✅')))).outcomes).toContain('reaction_order_before_cutoff_or_invalid_time');
      expect(s.store.compareAndSet).not.toHaveBeenCalled();
    }
  });
  it.each(['guest', 'kitchen'] as const)('accepts a %s target created exactly at cutoff', async targetKind => {
    const s = setup(); s.rows = [{ ...row(), targetKind, created_at: config.liveAfter }];
    expect((await run(s, post(action()))).outcomes).toContain('order_preparing');
    expect(s.store.compareAndSet).toHaveBeenCalledWith(expect.anything(), ref, 'preparing', config.liveAfter);
  });
  it.each([['👍🏽', 'preparing'], ['🙏🏻', 'completed'], ['❌', 'cancelled']])('maps %s', async (emoji, status) => {
    const s = setup(); await run(s, post(action(emoji))); expect(s.rows[0].order_status).toBe(status);
  });
  it('preserves paid authority for every explicitly configured operator', async () => {
    const s = setup(); expect((await run(s, post(action('✅')))).outcomes).toContain('order_paid');
    await run(s, post(action('✅')), { ...config, }); expect(s.rows[0].order_status).toBe('paid');
  });
  it.each([{ source: 'api' }, { source: undefined }, { from: '66631457299' }, { from: '11111111111@lid' }, { sender_id: '66800000002' }])('rejects unauthorized source/actor %j', async overrides => {
    const s = setup(); await run(s, post(action('👍', overrides))); expect(s.store.find).not.toHaveBeenCalled();
  });
  it('accepts explicitly authorized shared restaurant identity in observed mobile post shape', async () => {
    const s = setup();
    const c = { ...config, operatorPhones: [...config.operatorPhones, '66631457299'] };
    expect((await run(s, post(action('👍', { from: '66631457299', from_me: true })), c)).outcomes).toContain('order_preparing');
    expect(s.store.compareAndSet).toHaveBeenCalledTimes(1);
  });
  it('does not use provider from_me as authority', async () => {
    const s = setup(); await run(s, post(action('👍', { from: '66631457299', from_me: true }))); expect(s.store.find).not.toHaveBeenCalled();
  });
  it.each(['⭐', '', '🎉'])('does not route unrelated or removal emoji %s', async emoji => {
    const s = setup(); await run(s, post(action(emoji))); expect(s.store.find).not.toHaveBeenCalled();
  });
  it('rejects wrong triplet, ambiguous matches and context conflicts', async () => {
    const s = setup(); await run(s, post(action('👍', { chat_id: '49123456780@s.whatsapp.net' })));
    expect(s.store.compareAndSet).not.toHaveBeenCalled();
    s.rows = [row(), { ...row(), id: 43 }]; await run(s, post(action())); expect(s.store.compareAndSet).not.toHaveBeenCalled();
  });
  it('duplicates and out-of-order events never regress completed or paid', async () => {
    const s = setup(); await run(s, post(action('🙏'), action('👍'), action('🙏')));
    expect(s.rows[0].order_status).toBe('completed'); expect(s.store.compareAndSet).toHaveBeenCalledTimes(1);
    await run(s, post(action('✅')), { ...config, });
    await run(s, post(action('❌'), action('🙏'))); expect(s.rows[0].order_status).toBe('paid');
  });
  it('preserves legacy cancelled-to-paid correction while rejecting preparation rollback', async () => {
    const s = setup(); s.rows[0].order_status = 'cancelled'; await run(s, post(action('👍'), action('🙏')));
    expect(s.store.compareAndSet).not.toHaveBeenCalled();
    await run(s, post(action('✅')), { ...config, }); expect(s.rows[0].order_status).toBe('paid');
    expect(s.store.compareAndSet).toHaveBeenCalledTimes(1);
  });
  it('CAS race never overwrites concurrent later state', async () => {
    const s = setup(); vi.mocked(s.store.compareAndSet).mockResolvedValue(false);
    expect((await run(s, post(action()))).outcomes).toContain('reaction_concurrent_noop');
  });
  it('uncertain persistence returns retry; replay sees stored state and is idempotent', async () => {
    const s = setup(); vi.mocked(s.store.compareAndSet).mockImplementationOnce(async () => { s.rows[0].order_status = 'preparing'; throw new Error('private details'); });
    expect((await run(s, post(action()))).httpStatus).toBe(503);
    expect((await run(s, post(action()))).outcomes).toContain('reaction_idempotent');
  });
});
describe('patch action provenance, not reconnect snapshot replay', () => {
  const rx = { from: operator, emoji: '🙏', target: ref.messageId };
  const patch = (overrides = {}) => ({ channel_id: config.channelId, event: { type: 'messages', event: 'patch' }, messages_updates: [{
    id: ref.messageId, chat_id: ref.chatId, before_update: { reactions: [] }, after_update: { reactions: [rx] }, trigger: action('🙏'), ...overrides,
  }] });
  it('applies new explicit fresh patch action once', async () => {
    const s = setup(); await run(s, patch()); expect(s.rows[0].order_status).toBe('completed');
  });
  it('keeps reaction event ID separate from target ID with explicit fresh provenance', async () => {
    const s = setup(); await run(s, patch({id:'reaction-event',trigger:action('🙏',{id:undefined})}));
    expect(s.store.find).toHaveBeenCalledWith(ref); expect(s.rows[0].order_status).toBe('completed');
  });
  it('does not synthesize freshness for legacy patch fixtures missing timestamps', async () => {
    const s = setup(); await run(s, patch({id:'reaction-event',trigger:action('🙏',{id:undefined,timestamp:undefined})}));
    expect(s.store.find).not.toHaveBeenCalled();
  });
  it.each([{ trigger: {} }, { after_update: { reactions: [] } }, { before_update: { reactions: [rx] } }, { trigger: action('🙏', { timestamp: time - 600 }) }])('rejects replay/removal/missing provenance %j', async overrides => {
    const s = setup(); await run(s, patch(overrides)); expect(s.store.find).not.toHaveBeenCalled();
  });
});

describe('Supabase adapter conditional write contract', () => {
  it.each(['guest', 'kitchen'] as const)('fails closed in %s CAS before any DB access for old/missing cutoff', async targetKind => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const client = { rpc: vi.fn(), from: vi.fn() }; const store = createOrderWebhookStore(client as never);
    expect(await store.compareAndSet({...row(),targetKind,created_at:'2020-01-01'},ref,'paid',config.liveAfter)).toBe(false);
    expect(await store.compareAndSet({...row(),targetKind},ref,'paid','invalid')).toBe(false);
    expect(client.rpc).not.toHaveBeenCalled(); expect(client.from).not.toHaveBeenCalled();
  });
  const clientFixture = (responses: unknown[]) => {
    const calls: { method: string; args: unknown[] }[][] = [];
    const client = { from: vi.fn((table: string) => {
      const trace = [{ method: 'from', args: [table] }]; calls.push(trace);
      const response = responses.shift();
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'update', 'eq', 'gte', 'is', 'limit']) chain[method] = (...args: unknown[]) => { trace.push({ method, args }); return chain; };
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(response).then(resolve);
      return chain;
    }) };
    return { client, calls };
  };
  it('binds only through the cooperating exact-target RPC', async () => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const rpc=vi.fn(async()=>({data:'bound',error:null})); const from=vi.fn();
    expect(await createOrderWebhookStore({rpc,from} as never).bind(42,ref,config.liveAfter)).toBe('bound');
    expect(rpc).toHaveBeenCalledWith('restaurant_bind_order_target_v1',{p_order_id:42,p_message_id:ref.messageId,p_chat_id:ref.chatId,p_channel_id:ref.channelId,p_live_after:config.liveAfter});
    expect(from).not.toHaveBeenCalled();
  });
  it('never falls back to direct writes if binding RPC is missing', async () => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const rpc=vi.fn(async()=>({data:null,error:{message:'missing'}})); const from=vi.fn();
    await expect(createOrderWebhookStore({rpc,from} as never).bind(42,ref,config.liveAfter)).rejects.toThrow('order_store_error');
    expect(from).not.toHaveBeenCalled();
  });
  it('status-only CAS repeats exact row, previous status and all three reference guards', async () => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const f = clientFixture([{ data: [{ id: 42 }], error: null }]);
    await createOrderWebhookStore(f.client as never).compareAndSet(row(), ref, 'completed', config.liveAfter);
    expect(f.calls[0]).toEqual(expect.arrayContaining([
      { method: 'update', args: [{ order_status: 'completed' }] },
      { method: 'eq', args: ['created_at', row().created_at] }, { method: 'gte', args: ['created_at', config.liveAfter] },
      { method: 'eq', args: ['id', 42] }, { method: 'eq', args: ['order_status', 'new'] },
      { method: 'eq', args: ['kitchen_whapi_message_id', ref.messageId] },
      { method: 'eq', args: ['kitchen_whapi_chat_id', ref.chatId] },
      { method: 'eq', args: ['kitchen_whapi_channel_id', ref.channelId] },
    ]));
  });
  it('database errors fail closed without exposing SQL detail', async () => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const f = clientFixture([{ data: null, error: { message: 'private SQL' } }]);
    await expect(createOrderWebhookStore(f.client as never).find(ref)).rejects.toThrow('order_store_error');
  });
  it('resolves only an exact sent kitchen tuple and preserves original order binding', async () => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const f = clientFixture([{data:[],error:null},{data:[{order_id:42}],error:null},{data:[row()],error:null}]);
    const found = await createOrderWebhookStore(f.client as never).find(ref);
    expect(found).toEqual([{...row(),targetKind:'kitchen'}]);
    expect(f.calls[1]).toEqual(expect.arrayContaining([
      {method:'eq',args:['message_id',ref.messageId]}, {method:'eq',args:['chat_id',ref.chatId]},
      {method:'eq',args:['channel_id',ref.channelId]}, {method:'eq',args:['status','sent']},
    ]));
  });
  it('rejects competing exact original and kitchen mappings even for same order', async () => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const f = clientFixture([{data:[row()],error:null},{data:[{order_id:42}],error:null}]);
    expect(await createOrderWebhookStore(f.client as never).find(ref)).toHaveLength(2);
  });
  it('uses one atomic RPC for kitchen mapping authorization and status CAS', async () => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const rpc = vi.fn(async () => ({ data:true,error:null }));
    const client = { rpc, from:vi.fn() };
    expect(await createOrderWebhookStore(client as never).compareAndSet({...row(),targetKind:'kitchen'},ref,'paid',config.liveAfter)).toBe(true);
    expect(rpc).toHaveBeenCalledWith('restaurant_apply_kitchen_reaction_v1', {
      p_order_id:42,p_message_id:ref.messageId,p_chat_id:ref.chatId,p_channel_id:ref.channelId,p_expected_status:'new',p_target_status:'paid',p_live_after:config.liveAfter,
    });
    expect(client.from).not.toHaveBeenCalled();
  });
  it('fails closed on RPC rejection or unavailable migration', async () => {
    const { createOrderWebhookStore } = await import('./restaurantOrderWebhook');
    const rpc = vi.fn().mockResolvedValueOnce({data:false,error:null}).mockResolvedValueOnce({data:null,error:{message:'missing RPC'}});
    const store=createOrderWebhookStore({rpc} as never);
    expect(await store.compareAndSet({...row(),targetKind:'kitchen'},ref,'paid',config.liveAfter)).toBe(false);
    await expect(store.compareAndSet({...row(),targetKind:'kitchen'},ref,'paid',config.liveAfter)).rejects.toThrow('order_store_error');
  });

});
