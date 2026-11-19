import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

const CHANNEL = 'GRNLTR-V67TK';
const PHONE = '66631457299';
const ORIGIN = 'https://gate.whapi.cloud';
const FAQ_ID = 45;
const CANARY_WINDOW_MS = 2 * 60 * 60 * 1000;
export const APPROVED_HOURS = 'We start taking orders at 8:30 a.m. every day. Last orders are at 8:30 p.m. Sunday through Friday and 5:00 p.m. on Saturdays, unless a sign at the restaurant lists different hours. Please order through our menu: https://menu.coconut.holiday/menu';
const DM = /^([1-9]\d{7,14})@s\.whatsapp\.net$/;
const ID = /^[A-Za-z0-9._-]{1,250}$/;
const asObj = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const str = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const isHistory = (o: Record<string,unknown>) => o.history === true || o.is_history === true;
const seconds = (v: unknown) => typeof v === 'number' ? v : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
const day = '(?:today|tomorrow|(?:on )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?)';
const when = '(?: ' + day + ')?';
const matchers = [
  new RegExp('^(?:what time|when) (?:do you|does (?:the )?(?:restaurant|kitchen)) (?:open|close|start taking orders|stop taking orders)' + when + '$'),
  new RegExp('^(?:what time|when) (?:is|are) (?:the )?(?:first|last) orders?' + when + '$'),
  new RegExp('^(?:what time|when) (?:is|are) (?:you|(?:the )?(?:restaurant|kitchen)) (?:opening|closing)' + when + '$'),
  new RegExp('^(?:(?:what are|what is) (?:your |the )?)?(?:(?:restaurant|kitchen) )?(?:opening hours|business hours|hours|closing time|opening time)' + when + '$'),
  new RegExp('^(?:are you|is (?:the )?(?:restaurant|kitchen)) open(?: now| right now| ' + day + ')?$'),
];

export function isRestaurantHoursQuestion(body: unknown): boolean {
  if (typeof body !== 'string' || body.length > 180 || /[\r\n]/.test(body)) return false;
  const question = body.toLowerCase().trim().replace(/\s+/g, ' ')
    .replace(/^(?:hi|hello|hey|good morning|good evening)[,!]? /, '')
    .replace(/(?:,? (?:please|thanks|thank you))?[.?!]+$/, '')
    .replace(/,? (?:please|thanks|thank you)$/, '').trim();
  return matchers.some(matcher => matcher.test(question));
}

export type HoursInbound = { chatId: string; id: string; at: number };
export function collectRestaurantHours(payload: unknown): HoursInbound[] {
  const p = asObj(payload), event = asObj(p.event);
  if (p.channel_id !== CHANNEL || isHistory(p) || isHistory(event) || event.type !== 'messages' || event.event !== 'post'
      || !Array.isArray(p.messages) || p.messages.length > 50) return [];
  const byId = new Map<string, HoursInbound | null>();
  for (const raw of p.messages) {
    const m = asObj(raw), id = str(m.id);
    if (!ID.test(id)) continue;
    const body = asObj(m.text);
    const chatId = str(m.chat_id), phone = DM.exec(chatId)?.[1];
    const at = seconds(m.timestamp) * 1000;
    const senders = [m.from, m.sender_id, m.author].filter(v => v !== undefined && v !== null && v !== '');
    const forwarded = [m, body, asObj(m.context), asObj(m.context_info), asObj(m.contextInfo), asObj(body.context_info), asObj(body.contextInfo)].some(o =>
      Boolean(o.forwarded || o.is_forwarded || o.forwarding_score || o.forwardingScore || o.isForwarded || o.forwarded_count || o.is_forwarded_many_times));
    // Require affirmative direct-sender evidence, not simply a chat name.
    const direct = phone && phone !== PHONE && senders.length && senders.every(v => v === phone || v === chatId || v === phone + '@c.us');
    const valid = m.type === 'text' && (m.source === 'mobile' || m.source === 'web') && m.from_me === false && !isHistory(m) && !forwarded && m.is_group !== true
      && !m.quoted && !m.quoted_id && !m.quoted_message && !m.quoted_message_id && !m.action
      && (m.channel_id === undefined || m.channel_id === CHANNEL) && direct
      && Number.isFinite(at) && at > 0 && isRestaurantHoursQuestion(body.body);
    const prior = byId.get(id);
    if (prior === null || !valid || (prior && (prior.chatId !== chatId || prior.at !== at))) byId.set(id, null);
    else if (!prior) byId.set(id, { chatId, id, at });
  }
  return [...byId.values()].filter((value): value is HoursInbound => value !== null);
}

type Handler = (item: HoursInbound, budget: AbortSignal) => Promise<string>;
export async function runRestaurantHoursBatch(input: HoursInbound[], handle: Handler, budget: AbortSignal): Promise<Record<string,number>> {
  let next = 0;
  const codes: Record<string,number> = {};
  const count = (key: string) => { codes[key] = (codes[key] ?? 0) + 1; };
  const run = async () => {
    while (next < input.length && !budget.aborted) {
      try { count(await handle(input[next++], budget)); }
      catch { count('hours_unconfirmed'); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, input.length) }, run));
  if (next < input.length) codes.hours_deadline = input.length - next;
  return codes;
}

export function createRestaurantHoursHandler(client: SupabaseClient, env: NodeJS.ProcessEnv, fetcher: typeof fetch = fetch, clock = Date.now): Handler | undefined {
  if (env.RESTAURANT_HOURS_FAQ_ENABLED !== 'true') return undefined;
  const token = str(env.RESTAURANT_WHAPI_TOKEN);
  const cutoff = str(env.RESTAURANT_HOURS_FAQ_LIVE_AFTER);
  const parsed = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(cutoff) ? Date.parse(cutoff) : NaN;
  const canonical = cutoff.includes('.') ? cutoff : cutoff.replace(/Z$/, '.000Z');
  const floor = Number.isFinite(parsed) && new Date(parsed).toISOString() === canonical ? parsed : NaN;
  const sunset = floor + CANARY_WINDOW_MS;
  // Default-disabled also protects production from absent/malformed canary scope.
  const mode = env.RESTAURANT_HOURS_FAQ_SCOPE;
  const canary = str(env.RESTAURANT_HOURS_FAQ_CANARY_CHAT);
  if (!token || env.RESTAURANT_WHAPI_CHANNEL_ID?.trim() !== CHANNEL || env.RESTAURANT_WHAPI_PHONE?.trim() !== PHONE
      || !Number.isFinite(floor) || mode !== 'staff-canary'
      || !DM.test(canary) || canary === PHONE + '@s.whatsapp.net') {
    return async () => 'hours_invalid_configuration';
  }
  const signal = (budget: AbortSignal) => AbortSignal.any([budget, AbortSignal.timeout(4000)]);
  const call = (path: string, budget: AbortSignal, init: RequestInit = {}) => fetcher(ORIGIN + path, {
    ...init, redirect: 'error', signal: signal(budget),
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  });
  return async ({ chatId, id, at }, budget) => {
    const fresh = () => {
      const now = clock();
      return !budget.aborted && now >= floor && now < sunset && at >= floor && at < sunset && at >= now - 120_000 && at <= now + 5_000;
    };
    if (!ID.test(id) || chatId !== canary || !fresh())
      return 'hours_ineligible';
    const { data: faq, error } = await client.from('chatbot_faqs')
      .select('id,question,answer,is_active').eq('id', FAQ_ID).eq('is_active', true)
      .abortSignal(signal(budget)).maybeSingle();
    // Fetch the source of truth and reject unreviewed edits. No stale fallback.
    if (error || faq?.id !== FAQ_ID || faq.is_active !== true
        || faq.question !== 'What are the restaurant hours?' || faq.answer !== APPROVED_HOURS) return 'hours_faq_not_approved';
    if (!fresh()) return 'hours_expired';
    try {
      const response = await call('/health?wakeup=false', budget);
      if (!response.ok) return 'hours_sender_unverified';
      const health = asObj(await response.json()), self = asObj(health.user).id;
      if (asObj(health.status).text !== 'AUTH' || health.channel_id !== CHANNEL
          || (self !== PHONE && self !== PHONE + '@s.whatsapp.net')) return 'hours_sender_unverified';
    } catch { return 'hours_sender_unverified'; }
    if (!fresh()) return 'hours_expired';
    const claimed = await client.from('restaurant_hours_faq_attempts')
      .upsert({ channel_id: CHANNEL, inbound_message_id: id }, { onConflict: 'channel_id,inbound_message_id', ignoreDuplicates: true })
      .select('inbound_message_id').abortSignal(signal(budget));
    if (claimed.error) return 'hours_claim_unconfirmed';
    if (!Array.isArray(claimed.data) || claimed.data.length === 0) return 'hours_duplicate';
    if (claimed.data.length !== 1 || claimed.data[0].inbound_message_id !== id) return 'hours_claim_unconfirmed';
    let status = 'uncertain', providerId: string | null = null;
    if (!fresh()) status = 'expired';
    else {
      try {
        const response = await call('/messages/text', budget, {
          method: 'POST', body: JSON.stringify({ to: chatId, body: faq.answer + '\n\n- Coco 🤖', no_link_preview: true }),
        });
        if (response.ok) {
          const data = asObj(await response.json()), message = asObj(data.message);
          const accepted = str(message.id) || str(data.id);
          const recipient = str(message.chat_id) || str(data.chat_id);
          if (data.sent !== false && !data.error && ID.test(accepted) && accepted !== id && (!recipient || recipient === chatId)) {
            status = 'sent'; providerId = accepted;
          }
        } else if ([400, 401, 402, 403, 404, 422, 429].includes(response.status)) status = 'failed';
      } catch { /* A claimed send is never retried, including provider timeout. */ }
    }
    const finalized = await client.from('restaurant_hours_faq_attempts')
      .update({ status, provider_message_id: providerId, finished_at: new Date(clock()).toISOString() })
      .eq('channel_id', CHANNEL).eq('inbound_message_id', id).eq('status', 'claimed')
      .select('inbound_message_id').abortSignal(signal(budget));
    return !finalized.error && finalized.data?.length === 1 ? 'hours_' + status : 'hours_finalization_unconfirmed';
  };
}
