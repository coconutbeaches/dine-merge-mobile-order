import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

// Deliberately independent of the guest bot and provider-switch prototypes.
// No direct send/reply capability. Only run after shared-secret authentication.
type Obj = Record<string, unknown>;
const obj = (x: unknown): Obj => x !== null && typeof x === 'object' && !Array.isArray(x) ? x as Obj : {};
const str = (x: unknown): string => typeof x === 'string' ? x.trim() : '';
const id = (x: unknown): string => { const s = str(x); return s && s.length <= 250 ? s : ''; };
const phone = (x: unknown): string => {
  const s = str(x).replace(/^\+/, '').replace(/@(s\.whatsapp\.net|c\.us)$/, '');
  return /^[1-9]\d{7,14}$/.test(s) ? s : '';
};
const chat = (x: unknown): string => {
  const s = id(x); const p = phone(s);
  return p ? `${p}@s.whatsapp.net` : (/^[0-9-]+@g\.us$/.test(s) ? s : '');
};
const timestamp = (x: unknown): number => {
  // WHAPI event timestamps are epoch seconds, not original target-message times.
  const n = typeof x === 'number' ? x : Number(str(x));
  return Number.isFinite(n) && n > 0 && n < 1e11 ? n * 1000 : NaN;
};
const statuses: Record<string, string> = { '👍': 'preparing', '🙏': 'completed', '✅': 'paid', '❌': 'cancelled' };
const prior: Record<string, Set<string>> = {
  preparing: new Set(['new']),
  completed: new Set(['new', 'preparing', 'ready', 'out_for_delivery']),
  paid: new Set(['new', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']),
  cancelled: new Set(['new', 'preparing', 'ready', 'out_for_delivery', 'completed']),
};
export type OrderWebhookConfig = {
  enabled: boolean; channelId: string; liveAfter: string;
  operatorPhones: string[]; signingSecret?: string;
};
export function orderWebhookConfig(env: NodeJS.ProcessEnv): OrderWebhookConfig {
  const list = (value: string | undefined) => (value ?? '').split(',').map(phone).filter(Boolean);
  return {
    enabled: env.RESTAURANT_ORDER_WEBHOOK_ENABLED === 'true',
    channelId: env.RESTAURANT_WHAPI_CHANNEL_ID?.trim() ?? '',
    liveAfter: env.RESTAURANT_ORDER_WEBHOOK_LIVE_AFTER?.trim() ?? '',
    operatorPhones: list(env.RESTAURANT_ORDER_OPERATOR_PHONES),
    signingSecret: env.RESTAURANT_ORDER_LINK_SIGNING_SECRET?.trim(),
  };
}
export type OrderRef = { messageId: string; chatId: string; channelId: string };
export type OrderRow = { targetKind?: 'guest' | 'kitchen'; id: number; created_at: string | null; order_status: string; kitchen_whapi_message_id: string | null; kitchen_whapi_chat_id: string | null; kitchen_whapi_channel_id: string | null };
export interface OrderWebhookStore {
  bind(orderId: number, ref: OrderRef, liveAfter: string): Promise<string>;
  find(ref: OrderRef): Promise<OrderRow[]>;
  compareAndSet(row: OrderRow, ref: OrderRef, target: string, liveAfter: string): Promise<boolean>;
}
const fields = 'id,created_at,order_status,kitchen_whapi_message_id,kitchen_whapi_chat_id,kitchen_whapi_channel_id';
export function createOrderWebhookStore(client: SupabaseClient): OrderWebhookStore {
  const checked = <T>(result: { data: T; error: unknown }): T => { if (result.error) throw new Error('order_store_error'); return result.data; };
  return {
    async bind(orderId, ref, liveAfter) {
      const result = checked(await client.rpc('restaurant_bind_order_target_v1', {
        p_order_id: orderId, p_message_id: ref.messageId, p_chat_id: ref.chatId,
        p_channel_id: ref.channelId, p_live_after: liveAfter,
      }));
      return typeof result === 'string' ? result : 'binding_conflict';
    },
    async find(ref) {
      const original = checked(await client.from('orders').select(fields).eq('kitchen_whapi_message_id', ref.messageId)
        .eq('kitchen_whapi_chat_id', ref.chatId).eq('kitchen_whapi_channel_id', ref.channelId).limit(2)) ?? [];
      const notifications = checked(await client.from('restaurant_kitchen_notifications').select('order_id')
        .eq('message_id', ref.messageId).eq('chat_id', ref.chatId).eq('channel_id', ref.channelId).eq('status', 'sent').limit(2)) ?? [];
      // Two exact sources are ambiguous even if they point to the same order.
      if (original.length + notifications.length > 1) return [{}, {}] as OrderRow[];
      if (!notifications.length) return original;
      const rows = checked(await client.from('orders').select(fields).eq('id', notifications[0].order_id).limit(2)) ?? [];
      return rows.map(row => ({ ...row, targetKind: 'kitchen' as const }));
    },
    async compareAndSet(row, ref, target, liveAfter) {
      if (!Number.isFinite(Date.parse(liveAfter)) || !row.created_at || !Number.isFinite(Date.parse(row.created_at)) || Date.parse(row.created_at) < Date.parse(liveAfter)) return false;
      if (row.targetKind === 'kitchen') {
        // Service-only proposed RPC locks/revalidates target and applies status CAS atomically.
        const changed = checked(await client.rpc('restaurant_apply_kitchen_reaction_v1', {
          p_order_id: row.id, p_message_id: ref.messageId, p_chat_id: ref.chatId,
          p_channel_id: ref.channelId, p_expected_status: row.order_status, p_target_status: target, p_live_after: liveAfter,
        }));
        return changed === true;
      }
      const updated = checked(await client.from('orders').update({ order_status: target }).eq('id', row.id)
        .eq('order_status', row.order_status).eq('created_at', row.created_at).gte('created_at', liveAfter).eq('kitchen_whapi_message_id', ref.messageId)
        .eq('kitchen_whapi_chat_id', ref.chatId).eq('kitchen_whapi_channel_id', ref.channelId).select('id'));
      return updated?.length === 1;
    },
  };
}

// Reject conflicting identity fields rather than treating a LID as a phone.
const actor = (...objects: Obj[]): string => {
  const values = objects.flatMap(o => [o.from, o.sender_id, o.author]).filter(v => v !== undefined && v !== null && v !== '');
  const phones = values.map(phone);
  return phones.length && phones.every(p => p && p === phones[0]) ? phones[0] : '';
};
const consistent = (values: unknown[], normalize: (v: unknown) => string): string => {
  const present = values.filter(v => v !== undefined && v !== null && v !== '');
  const normalized = present.map(normalize);
  return normalized.length && normalized.every(v => v && v === normalized[0]) ? normalized[0] : '';
};
const canonicalOrder = (body: unknown, secret: string | undefined): number | null => {
  if (typeof body !== 'string' || body.length > 32000) return null;
  const s = body.replace(/\r\n?/g, '\n');
  // Shared webhook authentication proves the provider, not the guest's order claim.
  // Accept only a server-signed legacy v1 Ref, never a guessable order number.
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) return null;
  const matches = [...s.matchAll(/^\*Order: #([1-9]\d*)\*$/gm)];
  if (matches.length !== 1 || !/^\*Items:\*\s*$/m.test(s) || !/^\*Total:\*\s*\S.+$/m.test(s)) return null;
  const value = Number(matches[0][1]);
  if (!Number.isSafeInteger(value)) return null;
  const refs = [...s.matchAll(/^Ref:\s*(\S+)\s*$/gm)];
  if (refs.length !== 1) return null;
  const parts = refs[0][1].split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !/^[A-Za-z0-9_-]+$/.test(parts[1]) || !/^[A-Za-z0-9_-]+$/.test(parts[2])) return null;
  const claim = Buffer.from(parts[1], 'base64url'), signature = Buffer.from(parts[2], 'base64url');
  if (claim.toString('base64url') !== parts[1] || signature.toString('base64url') !== parts[2] || claim.toString('utf8') !== String(value)) return null;
  const expected = createHmac('sha256', secret).update(`v1.${parts[1]}`).digest();
  return signature.length === expected.length && timingSafeEqual(signature, expected) ? value : null;
};
export type FeedbackReaction = { ref: OrderRef; timestampMs: number; eventId: string; actorPhone: string; fromMe: boolean };
export async function processRestaurantOrders(
  store: OrderWebhookStore, payload: unknown, config: OrderWebhookConfig,
  authenticated: boolean, now: Date = new Date(),
  onFeedback?: (reaction: FeedbackReaction) => void,
): Promise<{ httpStatus: 200 | 503; outcomes: string[] }> {
  const outcomes: string[] = [];
  const result = (code: string) => ({ httpStatus: 200 as const, outcomes: [code] });
  if (!config.enabled) return result('orders_disabled');
  const cutoff = Date.parse(config.liveAfter);
  if (!config.channelId || !Number.isFinite(cutoff) || !config.operatorPhones.length || !Number.isFinite(now.getTime())) return result('orders_configuration_invalid');
  if (!authenticated) return result('orders_unauthenticated');
  const p = obj(payload), event = obj(p.event);
  if (p.channel_id !== config.channelId || p.history === true || p.is_history === true) return result('orders_wrong_channel_or_history');
  const fresh = (value: unknown): boolean => {
    const t = timestamp(value);
    return Number.isFinite(t) && t >= cutoff && t >= now.getTime() - 120_000 && t <= now.getTime() + 5_000;
  };
  const reaction = async (message: Obj, action: Obj) => {
    // The timestamp is the new action's timestamp, never the target's creation time.
    if (!fresh(action.timestamp ?? message.timestamp)) { outcomes.push('reaction_not_fresh'); return; }
    const source = consistent([action.source, message.source], str);
    const sender = actor(message, action);
    if (!['mobile', 'web'].includes(source) || !sender || !config.operatorPhones.includes(sender)) { outcomes.push('reaction_unauthorized'); return; }
    const emoji = str(action.emoji ?? message.emoji).replace(/\uFE0F/g, '').replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
    const target = statuses[emoji];
    if (!target && !(emoji === '⭐' && onFeedback)) { outcomes.push('reaction_unsupported_or_removed'); return; }
    const ref = {
      messageId: consistent([action.target, message.target], id),
      chatId: consistent([action.chat_id, message.chat_id], chat), channelId: config.channelId,
    };
    if (!id(message.id) || !ref.messageId || !ref.chatId || (message.channel_id && message.channel_id !== config.channelId) || (action.channel_id && action.channel_id !== config.channelId)) { outcomes.push('reaction_bad_reference'); return; }
    if (emoji === '⭐' && onFeedback) {
      // Dedicated action: never set or mirror order status.
      if ([message, action].some(part => part.history === true || part.is_history === true)
        || (action.timestamp != null && message.timestamp != null
          && timestamp(action.timestamp) !== timestamp(message.timestamp))) {
        outcomes.push('feedback_history_or_timestamp_conflict'); return;
      }
      // Do not treat multistar or a skin-tone suffix as a single star.
      if (str(action.emoji ?? message.emoji).replace(/\uFE0F/g, '') !== '⭐') {
        outcomes.push('feedback_unsupported_emoji'); return;
      }
      try {
        onFeedback({ ref, timestampMs: timestamp(action.timestamp ?? message.timestamp), eventId: id(message.id), actorPhone: sender, fromMe: message.from_me === true && action.from_me !== false });
        outcomes.push('feedback_collected');
      } catch {
        outcomes.push('feedback_collection_error');
      }
      return;
    }
    const rows = await store.find(ref);
    if (rows.length !== 1) { outcomes.push(rows.length ? 'reaction_ambiguous' : 'reaction_unmapped'); return; }
    const row = rows[0];
    const orderCreated = row.created_at ? Date.parse(row.created_at) : NaN;
    if (!Number.isFinite(orderCreated) || orderCreated < cutoff || orderCreated > now.getTime()) { outcomes.push('reaction_order_before_cutoff_or_invalid_time'); return; }
    if (row.order_status === target) { outcomes.push('reaction_idempotent'); return; }
    if (!prior[target].has(row.order_status)) { outcomes.push('reaction_invalid_transition'); return; }
    outcomes.push(await store.compareAndSet(row, ref, target, config.liveAfter) ? `order_${target}` : 'reaction_concurrent_noop');
  };
  try {
    if (event.type === 'messages' && event.event === 'post' && Array.isArray(p.messages)) {
      if (p.messages.length > 50) return result('orders_batch_too_large');
      for (const raw of p.messages) {
        const m = obj(raw), a = obj(m.action);
        if (m.type === 'reaction' || (m.type === 'action' && a.type === 'reaction')) { await reaction(m, a); continue; }
        if (m.type !== 'text' || m.from_me !== false || !fresh(m.timestamp)) continue;
        const orderId = canonicalOrder(obj(m.text).body, config.signingSecret);
        const chatId = chat(m.chat_id), sender = actor(m);
        // Direct guest order only; reject groups, LIDs and sender/chat ambiguity.
        if (!orderId || !id(m.id) || !sender || chatId !== `${sender}@s.whatsapp.net` || (m.channel_id && m.channel_id !== config.channelId)) continue;
        outcomes.push(await store.bind(orderId, { messageId: id(m.id), chatId, channelId: config.channelId }, config.liveAfter));
      }
    } else if (event.type === 'messages' && event.event === 'patch' && Array.isArray(p.messages_updates)) {
      if (p.messages_updates.length > 50) return result('orders_batch_too_large');
      for (const raw of p.messages_updates) {
        const u = obj(raw), before = obj(u.before_update), after = obj(u.after_update), trigger = obj(u.trigger), a = obj(trigger.action);
        // Only an explicit fresh action is accepted. Snapshots alone may be reconnect history.
        if ([u, before, after].some(part => part.history === true || part.is_history === true)
            && str(a.emoji).replace(/\uFE0F/g, '') === '⭐') continue;
        if (trigger.type !== 'action' || a.type !== 'reaction' || !Array.isArray(before.reactions) || !Array.isArray(after.reactions)) continue;
        if (before.reactions.length > 50 || after.reactions.length > 50) continue;
        const sender = actor(trigger, a), emoji = str(a.emoji), target = id(a.target);
        if (!sender || !emoji || !target || !id(u.id)) continue;
        const matches = (rx: unknown) => {
          const r = obj(rx); return actor(r) === sender && str(r.emoji) === emoji && id(r.target) === target;
        };
        if (before.reactions.some(matches) || !after.reactions.some(matches)) continue;
        const snapshotChat = consistent([u.chat_id, before.chat_id, after.chat_id, trigger.chat_id], chat);
        if (!snapshotChat || (u.channel_id && u.channel_id !== config.channelId)) continue;
        await reaction({ ...trigger, id: id(trigger.id) || id(u.id), chat_id: snapshotChat }, a);
      }
    }
    return { httpStatus: 200, outcomes };
  } catch {
    // Do not log payloads, identities, tokens or SQL errors.
    return { httpStatus: 503, outcomes: [...outcomes, 'orders_persistence_error'] };
  }
}
