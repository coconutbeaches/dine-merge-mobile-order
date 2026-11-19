import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { authenticate, configured, outboundConfig, deliverKitchen, reconcileReactions, kitchenBody, createWhapiProvider, type Config, type Store, type Provider, type Kitchen, type Event, type Order } from './restaurantOutbound';
const now = new Date('2026-11-18T05:00:00Z'), recent = '2026-11-18T04:59:00Z', old = '2026-11-17T04:59:00Z';
const config: Config = { enabled: true, liveAfter: '2026-11-18T04:00:00Z', channel: 'TEST-CHANNEL', phone: '66800000001', group: '123456789@g.us', token: 'synthetic', secret: 'synthetic-webhook-secret-32-characters' };
function setup() {
    let k: Kitchen = { order_id: 42, status: 'pending', created_at: recent, order_snapshot: { id: 42, order_items: [{ name: 'Rice', quantity: 1 }], total_amount: 30 } };
    let o: Order = { id: 42, created_at: recent, order_status: 'new', kitchen_whapi_channel_id: config.channel, kitchen_whapi_chat_id: '66800000002@s.whatsapp.net', kitchen_whapi_message_id: 'guest-msg' };
    let e: Event = { id: 4, order_id: 42, status: 'pending', created_at: recent, attempt_count: 0, next_attempt_at: recent };
    const store: Store = {
        kitchen: vi.fn(async () => ({ ...k })), order: vi.fn(async () => ({ ...o })), event: vi.fn(async () => ({ ...e })),
        claimKitchen: vi.fn(async (r, c, at) => { if (k.status !== 'pending')
            return null; k = { ...k, status: 'sending', attempted_at: at, channel_id: c.channel, chat_id: c.group }; return { ...k }; }),
        finishKitchen: vi.fn(async (r, at, status, id, code) => { if (k.status !== 'sending' || k.attempted_at !== at)
            return false; k = { ...k, status, message_id: id }; return true; }),
        claimEvent: vi.fn(async (r) => { if (e.status !== r.status || e.attempt_count !== r.attempt_count)
            return false; e = { ...e, status: 'sending', attempt_count: e.attempt_count + 1 }; return true; }),
        finishEvent: vi.fn(async (r, status) => { if (e.status !== 'sending' || e.attempt_count !== r.attempt_count + 1)
            return false; e = { ...e, status }; return true; }),
    };
    const provider: Provider = { verify: vi.fn(async () => true), send: vi.fn(async () => ({ status: 'sent', id: 'kitchen-msg', code: null })), react: vi.fn(async () => true) };
    return { store, provider, get k() { return k; }, set k(v) { k = v; }, get o() { return o; }, set o(v) { o = v; }, get e() { return e; }, set e(v) { e = v; } };
}
const deliver = (s: ReturnType<typeof setup>, c = config) => deliverKitchen(s.store, s.provider, c, 42, now);
const reconcile = (s: ReturnType<typeof setup>, c = config) => reconcileReactions(s.store, s.provider, c, 4, now);
function sent(s: ReturnType<typeof setup>) { s.k = { ...s.k, status: 'sent', message_id: 'kitchen-msg', chat_id: config.group, channel_id: config.channel }; s.o = { ...s.o, order_status: 'completed' }; }
describe('configuration and auth', () => {
    it('defaults closed and has no destination or identity defaults', () => { const c = outboundConfig({}); expect(c.enabled).toBe(false); expect(c.group).toBe(''); expect(c.channel).toBe(''); expect(configured(c)).toBeFalsy(); });
    it.each([{ enabled: false }, { liveAfter: '' }, { liveAfter: '2026-11-18' }, { phone: '' }, { channel: '' }, { group: 'guest@s.whatsapp.net' }, { token: '' }, { secret: 'short' }])('rejects unsafe config %j', async (x) => { const s = setup(); await deliver(s, { ...config, ...x }); expect(s.store.kitchen).not.toHaveBeenCalled(); expect(s.provider.verify).not.toHaveBeenCalled(); });
    it('compares auth exactly', () => { expect(authenticate(config.secret, config.secret)).toBe(true); expect(authenticate('bad', config.secret)).toBe(false); expect(authenticate(null, config.secret)).toBe(false); });
});
describe('notification isolation and uncertainty', () => {
    it('sends exact trigger snapshot after claim; repeat never resends', async () => { const s = setup(); expect((await deliver(s)).status).toBe('sent'); await deliver(s); expect(s.provider.send).toHaveBeenCalledTimes(1); expect(s.provider.send).toHaveBeenCalledWith(config, expect.stringContaining('*Order: #42*')); expect(s.store.finishEvent).not.toHaveBeenCalled(); });
    it.each(['sent', 'sending', 'uncertain', 'failed'])('does not reattempt %s', async (status) => { const s = setup(); s.k = { ...s.k, status }; await deliver(s); expect(s.provider.send).not.toHaveBeenCalled(); });
    it.each(['queue', 'order', 'future', 'missing'])('rejects historical/invalid %s before claims', async (kind) => { const s = setup(); if (kind === 'queue')
        s.k = { ...s.k, created_at: old };
    else
        s.o = { ...s.o, created_at: kind === 'order' ? old : kind === 'future' ? '2027-01-01T00:00:00Z' : '' }; await deliver(s); expect(s.store.claimKitchen).not.toHaveBeenCalled(); });
    it('cannot manufacture missing outbox', async () => { const s = setup(); vi.mocked(s.store.kitchen).mockResolvedValue(null); await deliver(s); expect(s.store.claimKitchen).not.toHaveBeenCalled(); });
    it('blocks changed canonical status and invalid snapshot', async () => { const s = setup(); s.o = { ...s.o, order_status: 'paid' }; await deliver(s); expect(s.provider.send).not.toHaveBeenCalled(); s.o = { ...s.o, order_status: 'new' }; s.k = { ...s.k, order_snapshot: { ...s.k.order_snapshot, id: 43 } }; await deliver(s); expect(s.store.claimKitchen).not.toHaveBeenCalled(); });
    it('does not send on lost/uncertain claim', async () => { const s = setup(); vi.mocked(s.store.claimKitchen).mockRejectedValue(new Error('private')); expect((await deliver(s)).code).toBe('claim_unconfirmed'); expect(s.provider.send).not.toHaveBeenCalled(); });
    it('losing concurrent claim cannot send', async () => { const s = setup(); vi.mocked(s.store.claimKitchen).mockResolvedValue(null); expect((await deliver(s)).status).toBe('deduped'); expect(s.provider.send).not.toHaveBeenCalled(); });
    it('identity mismatch never claims', async () => { const s = setup(); vi.mocked(s.provider.verify).mockResolvedValue(false); await deliver(s); expect(s.store.claimKitchen).not.toHaveBeenCalled(); });
    it('rechecks identity after claim', async () => { const s = setup(); vi.mocked(s.provider.verify).mockResolvedValueOnce(true).mockResolvedValue(false); expect((await deliver(s)).status).toBe('failed'); expect(s.provider.send).not.toHaveBeenCalled(); });
    it('network uncertainty remains fenced', async () => { const s = setup(); vi.mocked(s.provider.send).mockRejectedValue(new Error('private')); expect((await deliver(s)).status).toBe('uncertain'); expect(s.k.status).toBe('uncertain'); await deliver(s); expect(s.provider.send).toHaveBeenCalledTimes(1); });
    it('lost finalization does not reset claim', async () => { const s = setup(); vi.mocked(s.store.finishKitchen).mockResolvedValue(false); expect((await deliver(s)).code).toBe('finalize_unconfirmed'); expect(s.k.status).toBe('sending'); await deliver(s); expect(s.provider.send).toHaveBeenCalledTimes(1); });
});
describe('reconciliation exact targets and canonical rereads', () => {
    it('ignores requested history; mirrors canonical status to both persisted targets', async () => { const s = setup(); sent(s); expect((await reconcile(s)).status).toBe('succeeded'); expect(s.provider.react).toHaveBeenNthCalledWith(1, config, 'guest-msg', '🙏🏼'); expect(s.provider.react).toHaveBeenNthCalledWith(2, config, 'kitchen-msg', '🙏🏼'); await reconcile(s); expect(s.provider.react).toHaveBeenCalledTimes(2); });
    it.each(['event', 'order', 'kitchen'])('rejects historical %s', async (kind) => { const s = setup(); sent(s); if (kind === 'event')
        s.e = { ...s.e, created_at: old }; if (kind === 'order')
        s.o = { ...s.o, created_at: old }; if (kind === 'kitchen')
        s.k = { ...s.k, created_at: old }; await reconcile(s); expect(s.provider.react).not.toHaveBeenCalled(); });
    it.each([{ status: 'pending' }, { message_id: '' }, { channel_id: 'OTHER' }, { chat_id: '987@g.us' }, { message_id: 'guest-msg' }])('rejects invalid exact kitchen target %j', async (x) => { const s = setup(); sent(s); s.k = { ...s.k, ...x }; expect((await reconcile(s)).code).toBe('exact_targets_not_ready'); expect(s.provider.react).not.toHaveBeenCalled(); });
    it('rejects missing original guest target', async () => { const s = setup(); sent(s); s.o = { ...s.o, kitchen_whapi_message_id: null }; await reconcile(s); expect(s.provider.react).not.toHaveBeenCalled(); });
    it('keeps unsupported canonical status inert', async () => { const s = setup(); sent(s); s.o = { ...s.o, order_status: 'new' }; expect((await reconcile(s)).status).toBe('superseded'); expect(s.provider.react).not.toHaveBeenCalled(); });
    it('partial provider failure schedules bounded retry, never status update', async () => { const s = setup(); sent(s); vi.mocked(s.provider.react).mockResolvedValueOnce(true).mockResolvedValueOnce(false); expect((await reconcile(s)).status).toBe('retry_wait'); expect(s.store.finishEvent).toHaveBeenCalledWith(expect.anything(), 'retry_wait', 'completed', 'provider_reaction_failed', expect.any(String)); expect(s.o.order_status).toBe('completed'); });
    it('canonical change between targets stops second stale reaction', async () => { const s = setup(); sent(s); vi.mocked(s.provider.react).mockImplementationOnce(async () => { s.o = { ...s.o, order_status: 'paid' }; return true; }); expect((await reconcile(s)).code).toBe('canonical_or_targets_changed'); expect(s.provider.react).toHaveBeenCalledTimes(1); });
    it('lost generation prevents provider mutation', async () => { const s = setup(); sent(s); vi.mocked(s.store.event).mockResolvedValueOnce({ ...s.e }).mockResolvedValue({ ...s.e, status: 'sending', attempt_count: 99 }); expect((await reconcile(s)).code).toBe('lease_lost'); expect(s.provider.react).not.toHaveBeenCalled(); });
    it('uncertain claim cannot call provider', async () => { const s = setup(); sent(s); vi.mocked(s.store.claimEvent).mockRejectedValue(new Error('private')); expect((await reconcile(s)).code).toBe('claim_unconfirmed'); expect(s.provider.react).not.toHaveBeenCalled(); });
});
describe('provider HTTP boundary uses only mocked fetch', () => {
    it('checks channel, account and exact group; no wake', async () => { const f = vi.fn().mockResolvedValueOnce(Response.json({ status: { text: 'AUTH' }, channel_id: config.channel, user: { id: config.phone } })).mockResolvedValueOnce(Response.json({ id: config.group })); expect(await createWhapiProvider(f).verify(config)).toBe(true); expect(f.mock.calls[0][0]).toBe('https://gate.whapi.cloud/health?wakeup=false'); });
    it('wrong account or unknown shape fails closed', async () => { const f = vi.fn().mockResolvedValue(Response.json({ status: { text: 'AUTH' }, channel_id: config.channel, user: { id: '66800000009' } })); expect(await createWhapiProvider(f).verify(config)).toBe(false); expect(f).toHaveBeenCalledTimes(1); });
    it.each([400, 500])('classifies HTTP %s without exposing body', async (code) => { const f = vi.fn().mockResolvedValue(new Response('private', { status: code })); expect((await createWhapiProvider(f).send(config, 'synthetic')).status).toBe(code === 400 ? 'failed' : 'uncertain'); });
    it('success missing exact message ID is uncertain', async () => { const f = vi.fn().mockResolvedValue(Response.json({ ok: true })); expect((await createWhapiProvider(f).send(config, 'synthetic')).status).toBe('uncertain'); });
    it('encodes message ID and never follows redirects', async () => { const f = vi.fn().mockResolvedValue(Response.json({})); await createWhapiProvider(f).react(config, 'msg/123', '✅'); expect(f.mock.calls[0][0]).toContain('msg%2F123/reaction'); expect(f.mock.calls[0][1].redirect).toBe('error'); });
    it('formats existing order only, rejects absent items', () => { expect(kitchenBody({ id: 42, order_items: [] })).toBe(null); });
});

describe('legacy Python kitchen formatter fixture parity', () => {
    it('preserves room/stay/customer/options/rounding ticket layout', () => {
        expect(kitchenBody({id:42,table_number:'2',stay_id:'A1_TEST',customer_name:'Test Guest',order_items:[{menuItem:{name:'Rice'},quantity:2,selectedOptions:{spice:['Mild'],extra:'Egg'}}],total_amount:42.5})).toBe('2 // A1 TEST Test Guest\n*Order: #42*\n\n*Items:*\n- 2x Rice (Mild, Egg)\n\n*Total:* ฿42');
    });
});
