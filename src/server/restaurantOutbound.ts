import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
type Obj = Record<string, unknown>;
const object = (v: unknown): Obj => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Obj : {};
const text = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const validTime = (v: string) => /(?:Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v));
export type Config = {
    enabled: boolean;
    liveAfter: string;
    channel: string;
    phone: string;
    group: string;
    token: string;
    secret: string;
};
export const outboundConfig = (env: NodeJS.ProcessEnv): Config => ({
    enabled: env.RESTAURANT_OUTBOUND_ENABLED === 'true', liveAfter: env.RESTAURANT_OUTBOUND_LIVE_AFTER?.trim() ?? '',
    channel: env.RESTAURANT_WHAPI_CHANNEL_ID?.trim() ?? '', phone: env.RESTAURANT_WHAPI_PHONE?.trim() ?? '',
    group: env.RESTAURANT_KITCHEN_GROUP_ID?.trim() ?? '', token: env.RESTAURANT_WHAPI_TOKEN?.trim() ?? '',
    secret: env.RESTAURANT_KITCHEN_WEBHOOK_SECRET?.trim() ?? '',
});
export function configured(c: Config) { return c.enabled && validTime(c.liveAfter) && /^[A-Z0-9-]+$/.test(c.channel) && /^[1-9]\d{7,14}$/.test(c.phone) && /^\d+(?:-\d+)?@g\.us$/.test(c.group) && c.token.length > 0 && Buffer.byteLength(c.secret) >= 32; }
export function authenticate(value: string | null, secret: string) { const a = Buffer.from(value ?? ''), b = Buffer.from(secret); return b.length >= 32 && a.length === b.length && timingSafeEqual(a, b); }
export type Kitchen = {
    order_id: number;
    status: string;
    created_at: string;
    attempted_at?: string | null;
    order_snapshot: Obj;
    message_id?: string | null;
    chat_id?: string | null;
    channel_id?: string | null;
};
export type Event = {
    id: number;
    order_id: number;
    status: string;
    created_at: string;
    attempt_count: number;
    next_attempt_at: string;
};
export type Order = {
    id: number;
    created_at: string;
    order_status: string;
    kitchen_whapi_message_id?: string | null;
    kitchen_whapi_chat_id?: string | null;
    kitchen_whapi_channel_id?: string | null;
};
export interface Store {
    kitchen(id: number): Promise<Kitchen | null>;
    order(id: number): Promise<Order | null>;
    event(id: number): Promise<Event | null>;
    claimKitchen(row: Kitchen, c: Config, at: string): Promise<Kitchen | null>;
    finishKitchen(row: Kitchen, at: string, status: string, messageId: string | null, code: string | null, now: string): Promise<boolean>;
    claimEvent(row: Event, at: string): Promise<boolean>;
    finishEvent(row: Event, status: string, canonical: string | null, code: string | null, now: string): Promise<boolean>;
}
const KITCHEN = 'restaurant_kitchen_notifications', EVENTS = 'restaurant_order_reaction_reconciliations';
export function createOutboundStore(client: SupabaseClient): Store {
    async function rows<T>(query: PromiseLike<{
        data: unknown;
        error: unknown;
    }>): Promise<T[]> { const r = await query; if (r.error)
        throw new Error('store_unavailable'); return Array.isArray(r.data) ? r.data as T[] : []; }
    const one = async <T>(q: PromiseLike<{
        data: unknown;
        error: unknown;
    }>) => { const r = await rows<T>(q); if (r.length > 1)
        throw new Error('ambiguous_row'); return r[0] ?? null; };
    return {
        kitchen: id => one<Kitchen>(client.from(KITCHEN).select('order_id,status,created_at,attempted_at,order_snapshot,message_id,chat_id,channel_id').eq('order_id', id).limit(2)),
        order: id => one<Order>(client.from('orders').select('id,created_at,order_status,kitchen_whapi_message_id,kitchen_whapi_chat_id,kitchen_whapi_channel_id').eq('id', id).limit(2)),
        event: id => one<Event>(client.from(EVENTS).select('id,order_id,status,created_at,attempt_count,next_attempt_at').eq('id', id).limit(2)),
        claimKitchen: (r, c, at) => one<Kitchen>(client.from(KITCHEN).update({ status: 'sending', attempted_at: at, chat_id: c.group, channel_id: c.channel }).eq('order_id', r.order_id).eq('status', 'pending').eq('created_at', r.created_at).gte('created_at', c.liveAfter).select('*')),
        async finishKitchen(r, at, status, messageId, code, now) {
            if (status === 'sent') {
                const result = await client.rpc('restaurant_finalize_kitchen_notification_v1', { p_order_id: r.order_id, p_attempted_at: at, p_channel: r.channel_id, p_chat: r.chat_id, p_message: messageId, p_completed_at: now });
                if (result.error)
                    throw new Error('finalize_unconfirmed');
                return result.data === true;
            }
            return (await rows(client.from(KITCHEN).update({ status, message_id: messageId, error_code: code, completed_at: now }).eq('order_id', r.order_id).eq('status', 'sending').eq('attempted_at', at).eq('chat_id', r.chat_id).eq('channel_id', r.channel_id).is('message_id', null).select('order_id'))).length === 1;
        },
        async claimEvent(r, at) { return (await rows(client.from(EVENTS).update({ status: 'sending', attempt_count: r.attempt_count + 1, attempted_at: at, error_code: null }).eq('id', r.id).eq('status', r.status).eq('attempt_count', r.attempt_count).eq('created_at', r.created_at).select('id'))).length === 1; },
        async finishEvent(r, status, canonical, code, now) {
            const data: Obj = { status, reconciled_status: canonical, error_code: code, completed_at: status === 'retry_wait' ? null : now };
            if (status === 'retry_wait')
                data.next_attempt_at = new Date(Date.parse(now) + Math.min(900, 30 * 2 ** Math.min(r.attempt_count, 5)) * 1000).toISOString();
            return (await rows(client.from(EVENTS).update(data).eq('id', r.id).eq('status', 'sending').eq('attempt_count', r.attempt_count + 1).select('id'))).length === 1;
        },
    };
}
export interface Provider {
    verify(c: Config): Promise<boolean>;
    send(c: Config, body: string): Promise<{
        status: 'sent' | 'failed' | 'uncertain';
        id: string | null;
        code: string | null;
    }>;
    react(c: Config, message: string, emoji: string): Promise<boolean>;
}
// Fail closed on any unknown live response shape. Must be verified against a
// redacted live fixture before activation; never infer identity from token name.
export function createWhapiProvider(fetcher: typeof fetch = fetch): Provider {
    async function call(c: Config, path: string, init: RequestInit = {}) { return fetcher(`https://gate.whapi.cloud${path}`, { ...init, redirect: 'error', signal: AbortSignal.timeout(5000), headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' } }); }
    return {
        async verify(c) {
            try {
                const res = await call(c, '/health?wakeup=false');
                if (!res.ok)
                    return false;
                const p = object(await res.json());
                if (object(p.status).text !== 'AUTH' || p.channel_id !== c.channel || text(object(p.user).id).replace(/@s\.whatsapp\.net$/, '') !== c.phone)
                    return false;
                const g = await call(c, `/groups/${encodeURIComponent(c.group)}`);
                if (!g.ok)
                    return false;
                const group = object(await g.json());
                return group.id === c.group;
            }
            catch {
                return false;
            }
        },
        async send(c, body) {
            try {
                const r = await call(c, '/messages/text', { method: 'POST', body: JSON.stringify({ to: c.group, body }) });
                if (!r.ok)
                    return { status: r.status >= 500 ? 'uncertain' : 'failed', id: null, code: `whapi_http_${r.status}` };
                const p = object(await r.json());
                const id = text(object(p.message).id) || text(p.id);
                return id ? { status: 'sent', id, code: null } : { status: 'uncertain', id: null, code: 'provider_success_missing_id' };
            }
            catch {
                return { status: 'uncertain', id: null, code: 'provider_transport_uncertain' };
            }
        },
        async react(c, message, emoji) { try {
            return (await call(c, `/messages/${encodeURIComponent(message)}/reaction`, { method: 'PUT', body: JSON.stringify({ emoji }) })).ok;
        }
        catch {
            return false;
        } },
    };
}
const fresh = (created: string, c: Config, now: Date) => validTime(created) && Date.parse(created) >= Date.parse(c.liveAfter) && Date.parse(created) <= now.getTime();
const eligible = (id: number) => Number.isSafeInteger(id) && id > 0;
export function kitchenBody(snapshot: Obj): string | null {
    if (!eligible(Number(snapshot.id)) || !Array.isArray(snapshot.order_items) || !snapshot.order_items.length)
        return null;
    const lines = snapshot.order_items.map(raw => { const item = object(raw), menu = object(item.menuItem); const options = Object.values(object(item.selectedOptions)).flatMap(v => Array.isArray(v) ? v : [v]).map(String).filter(Boolean); const q = Number(item.quantity); return `- ${Number.isFinite(q) ? Math.max(1, Math.trunc(q)) : 1}x ${text(menu.name) || text(item.name) || text(item.product) || 'Item'}${options.length ? ` (${options.join(', ')})` : ''}`; });
    const name = text(snapshot.customer_name) || text(snapshot.guest_first_name) || 'Guest', stay = text(snapshot.stay_id);
    const who = stay.toLowerCase().includes('walkin') ? `Walkin ${name}` : `${stay ? stay.replace(/_/g, ' ') : 'Guest'} ${name}`;
    const total = Number(snapshot.total_amount);
    if (!Number.isFinite(total))
        return null;
    // Match the retired Python formatter's half-to-even integer rounding.
    const floor = Math.floor(total);
    const rounded = total - floor === 0.5 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(total);
    const body = `${text(snapshot.table_number) || 'Takeaway'} // ${who}\n*Order: #${snapshot.id}*\n\n*Items:*\n${lines.join('\n')}\n\n*Total:* ฿${rounded}`;
    return body.length <= 30000 ? body : null;
}
export type Outcome = {
    status: string;
    code?: string;
};
export async function deliverKitchen(store: Store, provider: Provider, c: Config, id: number, now = new Date()): Promise<Outcome> {
    if (!configured(c))
        return { status: 'disabled', code: 'configuration_closed' };
    if (!eligible(id))
        return { status: 'ignored', code: 'invalid_id' };
    let row: Kitchen | null;
    try {
        row = await store.kitchen(id);
        const order = await store.order(id);
        if (!row || !order)
            return { status: 'not_queued' };
        if (!fresh(row.created_at, c, now) || !fresh(order.created_at, c, now))
            return { status: 'ignored', code: 'before_cutoff_or_invalid_time' };
        if (row.status !== 'pending')
            return { status: row.status };
        if (order.order_status !== 'new')
            return { status: 'ignored', code: 'not_new' };
        if (row.order_snapshot.id !== id || !kitchenBody(row.order_snapshot))
            return { status: 'ignored', code: 'invalid_snapshot' };
        if (!await provider.verify(c))
            return { status: 'pending', code: 'identity_unverified' };
    }
    catch {
        return { status: 'uncertain', code: 'read_unconfirmed' };
    }
    const at = now.toISOString();
    try {
        row = await store.claimKitchen(row, c, at);
    }
    catch {
        return { status: 'uncertain', code: 'claim_unconfirmed' };
    }
    if (!row)
        return { status: 'deduped' };
    let result: {
        status: string;
        id: string | null;
        code: string | null;
    } = { status: 'uncertain', id: null, code: 'attempt_interrupted' };
    try { // Recheck the canonical order and identity after claim, before sending.
        const order = await store.order(id);
        const body = kitchenBody(row.order_snapshot);
        if (!order || !fresh(order.created_at, c, now) || order.order_status !== 'new' || !body || row.order_snapshot.id !== id)
            result = { status: 'failed', id: null, code: 'order_changed_or_invalid' };
        else if (!await provider.verify(c))
            result = { status: 'failed', id: null, code: 'identity_unverified' };
        else
            result = await provider.send(c, body);
    }
    catch { /* retain uncertain, never retry a possibly sent notification */ }
    try {
        if (!await store.finishKitchen(row, at, result.status, result.id, result.code, new Date().toISOString()))
            return { status: 'uncertain', code: 'finalize_unconfirmed' };
    }
    catch {
        return { status: 'uncertain', code: 'finalize_unconfirmed' };
    }
    return { status: result.status, ...(result.code ? { code: result.code } : {}) };
}
const emojis: Record<string, string> = { preparing: '👍🏻', completed: '🙏🏼', paid: '✅', cancelled: '❌' };
function targets(order: Order, k: Kitchen | null, c: Config, now: Date): string[] | null {
    if (!k || k.status !== 'sent' || !fresh(k.created_at, c, now) || k.chat_id !== c.group || k.channel_id !== c.channel || !text(k.message_id) || order.kitchen_whapi_channel_id !== c.channel || !text(order.kitchen_whapi_chat_id) || !text(order.kitchen_whapi_message_id) || order.kitchen_whapi_message_id === k.message_id)
        return null;
    return [order.kitchen_whapi_message_id!, k.message_id!];
}
export async function reconcileReactions(store: Store, provider: Provider, c: Config, id: number, now = new Date()): Promise<Outcome> {
    if (!configured(c))
        return { status: 'disabled', code: 'configuration_closed' };
    if (!eligible(id))
        return { status: 'ignored', code: 'invalid_id' };
    let e: Event | null, order: Order | null;
    try {
        e = await store.event(id);
        if (!e)
            return { status: 'not_queued' };
        order = await store.order(e.order_id);
        if (!order || !fresh(e.created_at, c, now) || !fresh(order.created_at, c, now))
            return { status: 'ignored', code: 'before_cutoff_or_invalid_time' };
        if (!['pending', 'retry_wait'].includes(e.status))
            return { status: e.status };
        if (!Number.isSafeInteger(e.attempt_count) || e.attempt_count < 0 || !validTime(e.next_attempt_at) || Date.parse(e.next_attempt_at) > now.getTime())
            return { status: 'ignored', code: 'not_due' };
        if (!await provider.verify(c))
            return { status: 'pending', code: 'identity_unverified' };
        if (!await store.claimEvent(e, now.toISOString()))
            return { status: 'deduped' };
    }
    catch {
        return { status: 'uncertain', code: 'claim_unconfirmed' };
    }
    const finish = async (status: string, canonical: string | null, code: string | null): Promise<Outcome> => {
        try {
            if (!await store.finishEvent(e!, status, canonical, code, new Date().toISOString()))
                return { status: 'uncertain', code: 'finalize_unconfirmed' };
        }
        catch {
            return { status: 'uncertain', code: 'finalize_unconfirmed' };
        }
        return { status, ...(code ? { code } : {}) };
    };
    try {
        order = await store.order(e.order_id);
        const k = await store.kitchen(e.order_id);
        if (!order || !fresh(order.created_at, c, now))
            return finish('superseded', null, 'order_ineligible');
        const canonical = order.order_status, emoji = emojis[canonical];
        if (!emoji)
            return finish('superseded', canonical, 'unsupported_status');
        const refs = targets(order, k, c, now);
        if (!refs)
            return finish('retry_wait', canonical, 'exact_targets_not_ready');
        for (const ref of refs) {
            const lease = await store.event(e.id);
            if (!lease || lease.status !== 'sending' || lease.attempt_count !== e.attempt_count + 1)
                return { status: 'uncertain', code: 'lease_lost' };
            const current = await store.order(e.order_id), currentKitchen = await store.kitchen(e.order_id);
            if (!current || current.order_status !== canonical || JSON.stringify(targets(current, currentKitchen, c, now)) !== JSON.stringify(refs))
                return finish('retry_wait', current?.order_status ?? null, 'canonical_or_targets_changed');
            if (!await provider.verify(c))
                return finish('retry_wait', canonical, 'identity_unverified');
            if (!await provider.react(c, ref, emoji))
                return finish('retry_wait', canonical, 'provider_reaction_failed');
        }
        const after = await store.order(e.order_id), afterKitchen = await store.kitchen(e.order_id);
        if (!after || after.order_status !== canonical || JSON.stringify(targets(after, afterKitchen, c, now)) !== JSON.stringify(refs))
            return finish('retry_wait', after?.order_status ?? null, 'canonical_or_targets_changed');
        return finish('succeeded', canonical, null);
    }
    catch {
        return finish('retry_wait', null, 'attempt_interrupted');
    }
}
