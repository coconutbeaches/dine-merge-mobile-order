import 'server-only';

// Temporary opt-in compatibility observation. Never log message content, phone
// numbers, message/chat IDs, credentials, or arbitrary keys/values from callbacks.
const keys = new Set(['event', 'type', 'source', 'timestamp', 'from_me', 'from', 'sender_id', 'author', 'id', 'target', 'chat_id', 'channel_id', 'messages', 'messages_updates', 'action', 'trigger', 'before_update', 'after_update', 'reactions', 'emoji', 'history', 'is_history']);
const enums = new Set(['messages', 'post', 'patch', 'put', 'action', 'reaction', 'mobile', 'web', 'api', 'system', '👍', '👍🏻', '👍🏼', '🙏', '🙏🏻', '🙏🏼', '✅', '❌']);
export function reactionObservation(payload: unknown): unknown | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  const items = [...(Array.isArray(p.messages) ? p.messages : []), ...(Array.isArray(p.messages_updates) ? p.messages_updates : [])];
  if (!items.some(x => x && typeof x === 'object' && (x.type === 'reaction' || x.action?.type === 'reaction' || x.trigger?.action?.type === 'reaction' || x.after_update?.reactions))) return null;
  function shape(value: unknown, key: string, depth: number): unknown {
    if (depth > 7) return '[depth]';
    if (Array.isArray(value)) return { count: value.length, sample: value.slice(0, 2).map(x => shape(x, key, depth + 1)) };
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => keys.has(k)).map(([k, v]) => [k, shape(v, k, depth + 1)]));
    if (typeof value === 'boolean') return value;
    if (value === null) return null;
    if (typeof value === 'number') return key === 'timestamp' ? { kind: 'number', epochSeconds: value > 1e9 && value < 1e11 } : '[number]';
    if (typeof value === 'string' && ['from', 'sender_id', 'author'].includes(key)) return { kind: 'string', phoneShape: /^\+?[1-9]\d{7,14}(@(s\.whatsapp\.net|c\.us))?$/.test(value), lidShape: value.endsWith('@lid') };
    if (typeof value === 'string') return ['type', 'source', 'event', 'emoji'].includes(key) && enums.has(value) ? value : '[string]';
    return '[other]';
  }
  return shape(payload, '', 0);
}
