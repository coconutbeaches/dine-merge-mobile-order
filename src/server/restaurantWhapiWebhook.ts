import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeRestaurantServiceLocation } from '@/lib/restaurantServiceLocation';
import {
  hashRestaurantGuestHandshakeRef,
  normalizeHandshakeFirstName,
  verifyRestaurantGuestHandshakeRef,
} from './restaurantGuestHandshake';

const MENU_COMPLETION_BASE_URL = 'https://menu.coconut.holiday/register/unknown';
const WHAPI_TEXT_URL = 'https://gate.whapi.cloud/messages/text';
const WEBHOOK_TOKEN_HEADER = 'x-coco-webhook-token';
const HANDSHAKE_REF_LINE = /^\s*Ref:\s*([A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}|h1\.[A-Za-z0-9_-]{20,80}\.[A-Za-z0-9_-]+)\s*$/gim;
const HANDSHAKE_NAME = /^\s*Hi\s+my\s+name\s+is\s+([\s\S]{1,100}?)\.\s*Please\s+send\s+me\s+the\s+menu\b/i;
const DIRECT_CHAT = /^([1-9]\d{7,14})@s\.whatsapp\.net$/;
const PHONE = /^[1-9]\d{7,14}$/;
const MAX_MESSAGES_PER_WEBHOOK = 50;

type UntypedClient = SupabaseClient;

export type ReplyDeliveryState = 'pending' | 'sending' | 'sent' | 'uncertain';

export type RestaurantHandshakeRow = {
  id: string;
  ref_hash: string;
  table_number: string;
  first_name: string;
  status: string;
  match_kind: string | null;
  phone_e164: string | null;
  whatsapp_chat_id: string | null;
  linked_incoming_guest_id: string | null;
  matched_stay_id: string | null;
  match_method: string | null;
  match_confidence: number | null;
  provider_channel_id: string | null;
  inbound_message_id: string | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  reply_sent_at: string | null;
  reply_delivery_state: ReplyDeliveryState;
  reply_attempted_at: string | null;
  reply_provider_message_id: string | null;
  last_error: string | null;
};

type Completion = {
  phone_e164: string;
  chat_id: string;
  channel_id: string;
  message_id: string;
  match_kind: 'hotel' | 'walkin';
  linked_incoming_guest_id: string | null;
  matched_stay_id: string | null;
  match_method: string;
  match_confidence: number;
  completed_at: string;
};

export type IdentityMatch = {
  incomingGuestId: string | null;
  stayId: string | null;
  method: string;
  confidence: number;
};

export interface RestaurantHandshakeStore {
  loadByRefHash(refHash: string): Promise<RestaurantHandshakeRow | null>;
  recordError(id: string, code: string): Promise<void>;
  expirePending(id: string): Promise<void>;
  completePending(id: string, completion: Completion): Promise<RestaurantHandshakeRow | null>;
  claimReply(id: string, attemptedAt: string): Promise<boolean>;
  markReplySent(id: string, providerMessageId: string, sentAt: string): Promise<boolean>;
  markReplyUncertain(id: string): Promise<void>;
  resolveIdentity(firstName: string, phoneE164: string, now: Date): Promise<IdentityMatch>;
  upsertDurableLink(row: RestaurantHandshakeRow): Promise<void>;
}

export type WebhookConfig = {
  expectedChannelId: string;
  restaurantToken: string;
  webhookTokens: string;
};

export type WebhookMessageOutcome =
  | 'ignored'
  | 'completed_reply_sent'
  | 'completed_reply_uncertain'
  | 'already_completed'
  | 'expired'
  | 'invalid_handshake'
  | 'persistence_error';

export type WebhookProcessingResult = {
  httpStatus: 200 | 503;
  outcomes: WebhookMessageOutcome[];
};

type ParsedHandshake = {
  ref: string;
  firstName: string;
  messageId: string;
  chatId: string;
  phoneE164: string;
};

type ProviderResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<ProviderResponse>;

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

export function authenticateRestaurantWebhook(
  suppliedToken: string | null,
  configuredTokens: string,
): boolean {
  const supplied = suppliedToken?.trim() ?? '';
  const tokens = configuredTokens.split(',').map((token) => token.trim()).filter(Boolean);
  if (!supplied || !tokens.length) return false;
  let matched = false;
  for (const token of tokens) matched = safeEqual(supplied, token) || matched;
  return matched;
}

const normalizeChatId = (value: unknown): string => {
  const raw = String(value ?? '').trim().replace(/[+\s]/g, '');
  if (/^[1-9]\d{7,14}$/.test(raw)) return `${raw}@s.whatsapp.net`;
  if (/^[1-9]\d{7,14}@c\.us$/.test(raw)) return `${raw.slice(0, -5)}@s.whatsapp.net`;
  return raw;
};

const normalizePhone = (value: unknown): string => {
  const raw = String(value ?? '').trim();
  if (!raw || /@(g\.us|lid)$/.test(raw)) return '';
  const digits = raw.replace(/\D/g, '');
  return PHONE.test(digits) ? digits : '';
};

const canonicalName = (value: unknown): string => {
  const normalized = normalizeHandshakeFirstName(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = {
    jon: 'jonathan', jonny: 'jonathan', johnny: 'john', sue: 'susan', suzy: 'susan',
    liz: 'elizabeth', lizzy: 'elizabeth', bill: 'william', bob: 'robert', rob: 'robert',
    stephan: 'stefan', muhammad: 'mohamed',
  };
  return aliases[normalized] ?? normalized;
};

const extractText = (message: Record<string, unknown>): string => {
  const text = message.text;
  if (text && typeof text === 'object') {
    const body = (text as Record<string, unknown>).body ?? (text as Record<string, unknown>).text;
    return typeof body === 'string' ? body.trim() : '';
  }
  if (typeof text === 'string') return text.trim();
  return typeof message.body === 'string' ? message.body.trim() : '';
};

export function parseRestaurantHandshakeMessage(message: unknown): ParsedHandshake | null {
  if (!message || typeof message !== 'object') return null;
  const candidate = message as Record<string, unknown>;
  if (candidate.from_me !== false || String(candidate.type ?? '').trim().toLowerCase() !== 'text') {
    return null;
  }
  const messageId = String(candidate.id ?? '').trim();
  const chatId = normalizeChatId(candidate.chat_id);
  const chatPhone = DIRECT_CHAT.exec(chatId)?.[1] ?? '';
  if (!messageId || messageId.length > 250 || !chatPhone) return null;

  const rawSenderValues = [candidate.from, candidate.sender_id, candidate.author]
    .filter((value) => value !== undefined && value !== null && String(value).trim());
  const explicitSenderValues = rawSenderValues.map(normalizePhone);
  if (explicitSenderValues.some((phone) => !phone || phone !== chatPhone)) return null;
  const phone = explicitSenderValues[0] ?? chatPhone;
  if (!phone) return null;

  const body = extractText(candidate);
  const refMatches = [...body.matchAll(HANDSHAKE_REF_LINE)];
  const nameMatch = HANDSHAKE_NAME.exec(body);
  if (refMatches.length !== 1 || !nameMatch) return null;
  const firstName = normalizeHandshakeFirstName(nameMatch[1]);
  if (!firstName || firstName.length > 100 || /[\r\n]/.test(firstName)) return null;
  return { ref: refMatches[0][1], firstName, messageId, chatId, phoneE164: `+${phone}` };
}

const providerMessageId = (value: unknown, depth = 0): string => {
  if (depth > 3 || !value) return '';
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 10)) {
      const found = providerMessageId(item, depth + 1);
      if (found) return found;
    }
    return '';
  }
  if (typeof value !== 'object') return '';
  const object = value as Record<string, unknown>;
  for (const key of ['message_id', 'messageId', 'id']) {
    const found = String(object[key] ?? '').trim();
    if (found && found.length <= 250) return found;
  }
  for (const key of ['message', 'data', 'messages', 'result']) {
    const found = providerMessageId(object[key], depth + 1);
    if (found) return found;
  }
  return '';
};

const completionUrl = (ref: string, tableNumber: string): string => {
  const url = new URL(MENU_COMPLETION_BASE_URL);
  url.searchParams.set('table', tableNumber);
  url.searchParams.set('handshake', ref);
  return url.toString();
};

async function deliverMenuReply(
  row: RestaurantHandshakeRow,
  ref: string,
  config: WebhookConfig,
  fetchImpl: FetchLike,
): Promise<{ state: 'sent'; messageId: string } | { state: 'uncertain' }> {
  const tableNumber = normalizeRestaurantServiceLocation(row.table_number);
  if (!tableNumber || !row.whatsapp_chat_id) return { state: 'uncertain' };
  const body = `Hi ${row.first_name} 👋\n\nHere is the menu:\n${completionUrl(ref, tableNumber)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetchImpl(WHAPI_TEXT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.restaurantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: row.whatsapp_chat_id,
        chat_id: row.whatsapp_chat_id,
        body,
        channel_id: config.expectedChannelId,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { state: 'uncertain' };
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { state: 'uncertain' };
    }
    const messageId = providerMessageId(json);
    return messageId ? { state: 'sent', messageId } : { state: 'uncertain' };
  } catch {
    return { state: 'uncertain' };
  } finally {
    clearTimeout(timeout);
  }
}

const sameCompletedIdentity = (row: RestaurantHandshakeRow, parsed: ParsedHandshake, channelId: string): boolean =>
  row.provider_channel_id === channelId &&
  row.inbound_message_id === parsed.messageId &&
  row.whatsapp_chat_id === parsed.chatId &&
  row.phone_e164 === parsed.phoneE164;

async function processMessage(
  store: RestaurantHandshakeStore,
  message: unknown,
  config: WebhookConfig,
  now: Date,
  fetchImpl: FetchLike,
): Promise<WebhookMessageOutcome> {
  const parsed = parseRestaurantHandshakeMessage(message);
  if (!parsed) return 'ignored';
  if (!verifyRestaurantGuestHandshakeRef(parsed.ref)) return 'invalid_handshake';

  const refHash = hashRestaurantGuestHandshakeRef(parsed.ref);
  let row: RestaurantHandshakeRow | null;
  try {
    row = await store.loadByRefHash(refHash);
  } catch {
    return 'persistence_error';
  }
  if (!row) return 'invalid_handshake';
  const tableNumber = normalizeRestaurantServiceLocation(row.table_number);
  if (!tableNumber || canonicalName(parsed.firstName) !== canonicalName(row.first_name)) {
    try { await store.recordError(row.id, tableNumber ? 'visible_name_mismatch' : 'invalid_restaurant_location'); } catch {}
    return 'invalid_handshake';
  }

  if (row.status === 'completed') {
    if (!sameCompletedIdentity(row, parsed, config.expectedChannelId)) return 'already_completed';
  } else {
    const expiresAt = Date.parse(row.expires_at);
    if (row.status === 'expired' || !Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
      try { await store.expirePending(row.id); } catch { return 'persistence_error'; }
      return 'expired';
    }
    if (row.status !== 'pending') return 'invalid_handshake';

    let identity: IdentityMatch;
    try {
      identity = await store.resolveIdentity(row.first_name, parsed.phoneE164, now);
    } catch {
      return 'persistence_error';
    }
    const hotelMatch = Boolean(identity.stayId && identity.confidence >= 0.96);
    const completedAt = now.toISOString();
    try {
      row = await store.completePending(row.id, {
        phone_e164: parsed.phoneE164,
        chat_id: parsed.chatId,
        channel_id: config.expectedChannelId,
        message_id: parsed.messageId,
        match_kind: hotelMatch ? 'hotel' : 'walkin',
        linked_incoming_guest_id: hotelMatch ? identity.incomingGuestId : null,
        matched_stay_id: hotelMatch ? identity.stayId!.trim().toUpperCase() : null,
        match_method: hotelMatch ? identity.method : 'no_strong_active_stay_match',
        match_confidence: hotelMatch ? identity.confidence : 0,
        completed_at: completedAt,
      });
      if (!row) {
        row = await store.loadByRefHash(refHash);
        if (row?.status === 'pending' && Date.parse(row.expires_at) <= now.getTime()) {
          await store.expirePending(row.id);
          return 'expired';
        }
        if (!row || row.status !== 'completed' || !sameCompletedIdentity(row, parsed, config.expectedChannelId)) {
          return 'persistence_error';
        }
      }
    } catch {
      return 'persistence_error';
    }
  }

  if (row.match_kind === 'hotel') {
    try { await store.upsertDurableLink(row); } catch { return 'persistence_error'; }
  }

  if (row.reply_delivery_state !== 'pending' || row.reply_sent_at) return 'already_completed';
  let claimed: boolean;
  try {
    claimed = await store.claimReply(row.id, now.toISOString());
  } catch {
    return 'persistence_error';
  }
  if (!claimed) return 'already_completed';

  const delivery = await deliverMenuReply(row, parsed.ref, config, fetchImpl);
  if (delivery.state === 'sent') {
    try {
      if (await store.markReplySent(row.id, delivery.messageId, new Date().toISOString())) {
        return 'completed_reply_sent';
      }
    } catch {}
  }
  try { await store.markReplyUncertain(row.id); } catch {}
  return 'completed_reply_uncertain';
}

export async function processRestaurantWhapiPayload(
  store: RestaurantHandshakeStore,
  payload: unknown,
  config: WebhookConfig,
  options: { now?: Date; fetchImpl?: FetchLike } = {},
): Promise<WebhookProcessingResult> {
  if (!payload || typeof payload !== 'object') return { httpStatus: 200, outcomes: ['ignored'] };
  const body = payload as Record<string, unknown>;
  const event = body.event && typeof body.event === 'object' ? body.event as Record<string, unknown> : {};
  if (String(event.type ?? '').trim().toLowerCase() !== 'messages' ||
      String(event.event ?? '').trim().toLowerCase() !== 'post') {
    return { httpStatus: 200, outcomes: ['ignored'] };
  }
  if (!config.expectedChannelId || String(body.channel_id ?? '').trim() !== config.expectedChannelId) {
    return { httpStatus: 200, outcomes: ['ignored'] };
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length || messages.length > MAX_MESSAGES_PER_WEBHOOK) {
    return { httpStatus: 200, outcomes: ['ignored'] };
  }
  const now = options.now ?? new Date();
  const fetchImpl = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const outcomes: WebhookMessageOutcome[] = [];
  for (const message of messages) outcomes.push(await processMessage(store, message, config, now, fetchImpl));
  return {
    httpStatus: outcomes.includes('persistence_error') ? 503 : 200,
    outcomes,
  };
}

type ActiveBooking = {
  id: string | null;
  stay_id: string;
  first_name: string | null;
  phone_e164: string | null;
  nationality_alpha3: string | null;
  updated_at: string | null;
};

const bangkokDate = (now: Date): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);

const countryPrefixes = ['+353', '+351', '+972', '+971', '+66', '+32', '+49', '+33', '+31', '+39', '+44', '+41', '+43', '+34', '+1', '+7', '+20', '+27', '+30', '+45', '+46', '+47', '+48', '+52', '+55', '+61', '+64', '+65', '+81', '+82', '+86', '+91'];
const nationalityCountry: Record<string, string> = { AUS: '+61', AUT: '+43', BEL: '+32', CHE: '+41', DEU: '+49', DNK: '+45', ESP: '+34', FRA: '+33', GBR: '+44', IRL: '+353', ISR: '+972', ITA: '+39', NLD: '+31', NOR: '+47', NZL: '+64', POL: '+48', PRT: '+351', SWE: '+46', THA: '+66', USA: '+1' };

const phoneCountry = (value: unknown): string | null => {
  const e164 = String(value ?? '').trim();
  return [...countryPrefixes].sort((a, b) => b.length - a.length).find((prefix) => e164.startsWith(prefix)) ?? null;
};

const givenNameVariants = (value: unknown): string[] => {
  const full = normalizeHandshakeFirstName(value);
  if (!full) return [];
  const seen = new Set<string>();
  return [full, ...full.split(' ')].filter((name) => {
    const key = canonicalName(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function matchActiveGuestIdentity(
  firstName: string,
  phoneE164: string,
  rows: ActiveBooking[],
): IdentityMatch {
  const observedName = canonicalName(firstName);
  const observedPhone = normalizePhone(phoneE164);
  const observedCountry = phoneCountry(phoneE164);
  const scored: Array<{ score: number; method: string; row: ActiveBooking }> = [];
  for (const row of [...rows].sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))) {
    const candidatePhone = normalizePhone(row.phone_e164);
    const variants = candidatePhone ? givenNameVariants(row.first_name).slice(0, 1) : givenNameVariants(row.first_name);
    for (const variant of variants) {
      const exactPhone = Boolean(observedPhone && candidatePhone && observedPhone === candidatePhone);
      const exactName = Boolean(observedName && observedName === canonicalName(variant));
      const country = phoneCountry(row.phone_e164) ?? nationalityCountry[String(row.nationality_alpha3 ?? '').toUpperCase()] ?? null;
      const countryMatch = Boolean(observedCountry && country && observedCountry === country);
      if (exactPhone) scored.push({ score: 1, method: exactName ? 'exact_first_name_and_phone' : 'exact_phone', row });
      else if (exactName && countryMatch) scored.push({ score: 0.96, method: 'exact_first_name_and_phone_country', row });
    }
  }
  if (!scored.length) return { incomingGuestId: null, stayId: null, method: 'no_match', confidence: 0 };
  const bestScore = Math.max(...scored.map((item) => item.score));
  const best = scored.filter((item) => item.score === bestScore);
  const stayIds = new Set(best.map((item) => item.row.stay_id.trim().toUpperCase()));
  if (best.length !== 1 || stayIds.size !== 1 || bestScore < 0.96) {
    return { incomingGuestId: null, stayId: null, method: 'ambiguous_or_weak', confidence: bestScore };
  }
  return {
    incomingGuestId: best[0].row.id || null,
    stayId: best[0].row.stay_id,
    method: best[0].method,
    confidence: best[0].score,
  };
}

const handshakeColumns = 'id,ref_hash,table_number,first_name,status,match_kind,phone_e164,whatsapp_chat_id,linked_incoming_guest_id,matched_stay_id,match_method,match_confidence,provider_channel_id,inbound_message_id,created_at,expires_at,completed_at,reply_sent_at,reply_delivery_state,reply_attempted_at,reply_provider_message_id,last_error';

export function createSupabaseRestaurantHandshakeStore(client: UntypedClient): RestaurantHandshakeStore {
  return {
    async loadByRefHash(refHash) {
      const { data, error } = await client.from('restaurant_guest_handshakes').select(handshakeColumns).eq('ref_hash', refHash).maybeSingle();
      if (error) throw error;
      return data as RestaurantHandshakeRow | null;
    },
    async recordError(id, code) {
      const { error } = await client.from('restaurant_guest_handshakes').update({ last_error: code.slice(0, 100) }).eq('id', id).eq('status', 'pending');
      if (error) throw error;
    },
    async expirePending(id) {
      const { error } = await client.from('restaurant_guest_handshakes').update({ status: 'expired', last_error: 'expired' }).eq('id', id).eq('status', 'pending');
      if (error) throw error;
    },
    async completePending(id, completion) {
      const { data, error } = await client.from('restaurant_guest_handshakes').update({
        status: 'completed', match_kind: completion.match_kind, phone_e164: completion.phone_e164,
        whatsapp_chat_id: completion.chat_id, linked_incoming_guest_id: completion.linked_incoming_guest_id,
        matched_stay_id: completion.matched_stay_id, match_method: completion.match_method,
        match_confidence: completion.match_confidence, provider_channel_id: completion.channel_id,
        inbound_message_id: completion.message_id, completed_at: completion.completed_at,
        reply_delivery_state: 'pending', last_error: null,
      }).eq('id', id).eq('status', 'pending').is('completed_at', null)
        .gt('expires_at', completion.completed_at).select(handshakeColumns).maybeSingle();
      if (error) throw error;
      return data as RestaurantHandshakeRow | null;
    },
    async claimReply(id, attemptedAt) {
      const { data, error } = await client.from('restaurant_guest_handshakes').update({
        reply_delivery_state: 'sending', reply_attempted_at: attemptedAt, last_error: null,
      }).eq('id', id).eq('status', 'completed').eq('reply_delivery_state', 'pending').is('reply_sent_at', null)
        .select('id').maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    async markReplySent(id, messageId, sentAt) {
      const { data, error } = await client.from('restaurant_guest_handshakes').update({
        reply_delivery_state: 'sent', reply_sent_at: sentAt,
        reply_provider_message_id: messageId, last_error: null,
      }).eq('id', id).eq('reply_delivery_state', 'sending').select('id').maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    async markReplyUncertain(id) {
      const { error } = await client.from('restaurant_guest_handshakes').update({
        reply_delivery_state: 'uncertain', last_error: 'reply_send_uncertain',
      }).eq('id', id).eq('reply_delivery_state', 'sending');
      if (error) throw error;
    },
    async resolveIdentity(firstName, phoneE164, now) {
      const today = bangkokDate(now);
      const fields = 'id,stay_id,first_name,phone_e164,nationality_alpha3,updated_at';
      const [inHouse, arrivals] = await Promise.all([
        client.from('incoming_guests').select(fields).eq('row_type', 'booking').ilike('booking_status', 'Booked')
          .eq('guest_journey', 'in_house').lte('check_in_date', today).gt('check_out_date', today).limit(500),
        client.from('incoming_guests').select(fields).eq('row_type', 'booking').ilike('booking_status', 'Booked')
          .eq('check_in_date', today).gt('check_out_date', today).limit(500),
      ]);
      if (inHouse.error || arrivals.error) throw inHouse.error ?? arrivals.error;
      const bookingRows = [...(inHouse.data ?? []), ...(arrivals.data ?? [])] as ActiveBooking[];
      const activeStays = new Set(bookingRows.map((row) => row.stay_id?.trim().toUpperCase()).filter(Boolean));
      if (!activeStays.size) return { incomingGuestId: null, stayId: null, method: 'no_active_stays', confidence: 0 };

      const { data: groupRows, error: groupError } = await client.from('stay_guest_identities')
        .select('stay_id,linked_incoming_guest_id,whatsapp_group_id').eq('phone_e164', phoneE164)
        .eq('source', 'group_membership').limit(50);
      if (groupError) throw groupError;
      const activeGroups = (groupRows ?? []).filter((row: Record<string, unknown>) =>
        activeStays.has(String(row.stay_id ?? '').trim().toUpperCase()) && String(row.whatsapp_group_id ?? '').trim());
      if (activeGroups.length) {
        const groupIds = [...new Set(activeGroups.map((row: Record<string, unknown>) => String(row.whatsapp_group_id)))];
        const { data: registered, error } = await client.from('whatsapp_groups').select('group_id,stay_id_normalized').in('group_id', groupIds).limit(100);
        if (error) throw error;
        const valid = new Set((registered ?? []).map((row: Record<string, unknown>) => `${row.group_id}:${String(row.stay_id_normalized ?? '').toUpperCase()}`));
        const matches = activeGroups.filter((row: Record<string, unknown>) => valid.has(`${row.whatsapp_group_id}:${String(row.stay_id ?? '').toUpperCase()}`));
        const stays = new Set(matches.map((row: Record<string, unknown>) => String(row.stay_id ?? '').toUpperCase()));
        if (stays.size === 1) {
          const match = matches[0] as Record<string, unknown>;
          return { incomingGuestId: String(match.linked_incoming_guest_id ?? '') || null, stayId: [...stays][0], method: 'exact_phone_registered_group_membership', confidence: 1 };
        }
      }

      const { data: links, error: linkError } = await client.from('restaurant_guest_links')
        .select('stay_id,linked_incoming_guest_id').eq('phone_e164', phoneE164).order('last_seen_at', { ascending: false }).limit(20);
      if (linkError) throw linkError;
      const activeLinks = (links ?? []).filter((row: Record<string, unknown>) => activeStays.has(String(row.stay_id ?? '').trim().toUpperCase()));
      const linkedStays = new Set(activeLinks.map((row: Record<string, unknown>) => String(row.stay_id ?? '').trim().toUpperCase()));
      if (linkedStays.size === 1) {
        const match = activeLinks[0] as Record<string, unknown>;
        return { incomingGuestId: String(match.linked_incoming_guest_id ?? '') || null, stayId: [...linkedStays][0], method: 'durable_phone_link_active_stay', confidence: 1 };
      }

      const { data: candidates, error: candidateError } = await client.from('incoming_guests').select(fields)
        .in('stay_id', [...activeStays]).limit(1000);
      if (candidateError) throw candidateError;
      return matchActiveGuestIdentity(firstName, phoneE164, (candidates ?? []) as ActiveBooking[]);
    },
    async upsertDurableLink(row) {
      if (!row.matched_stay_id || !row.phone_e164) return;
      const { error } = await client.from('restaurant_guest_links').upsert({
        phone_e164: row.phone_e164, stay_id: row.matched_stay_id, first_name: row.first_name,
        linked_incoming_guest_id: row.linked_incoming_guest_id, whatsapp_chat_id: row.whatsapp_chat_id,
        provider_channel_id: row.provider_channel_id, match_method: row.match_method,
        match_confidence: row.match_confidence, last_seen_at: new Date().toISOString(),
        evidence: { source: 'restaurant_whatsapp_handshake' },
      }, { onConflict: 'phone_e164,stay_id' });
      if (error) throw error;
    },
  };
}

export const RESTAURANT_WEBHOOK_TOKEN_HEADER = WEBHOOK_TOKEN_HEADER;
