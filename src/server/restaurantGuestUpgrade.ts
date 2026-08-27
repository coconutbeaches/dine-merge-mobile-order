import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabaseTypes';
import {
  buildRestaurantHandshakeWhatsAppUrl,
  hashRestaurantGuestHandshakeRef,
  issueRestaurantGuestHandshakeRef,
  normalizeHandshakeFirstName,
  RESTAURANT_GUEST_HANDSHAKE_COMPLETION_TTL_MINUTES,
  RESTAURANT_GUEST_HANDSHAKE_TTL_MINUTES,
  verifyRestaurantGuestHandshakeRef,
} from './restaurantGuestHandshake';
import { normalizeRestaurantServiceLocation } from '@/lib/restaurantServiceLocation';

type Client = SupabaseClient<Database>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_HISTORY = 500;

export class GuestUpgradeError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

function requireValue(condition: unknown, message: string, status = 409): asserts condition {
  if (!condition) throw new GuestUpgradeError(message, status);
}

async function loadGuest(client: Client, id: string, stayId: string) {
  requireValue(UUID.test(id) && /^walkin-/i.test(stayId), 'This upgrade requires an existing walk-in account.', 400);
  const { data, error } = await client.from('guests')
    .select('id,stay_id,first_name').eq('id', id).maybeSingle();
  requireValue(!error, 'Could not check the existing account. Please try again.', 503);
  requireValue(data && data.stay_id === stayId, 'The existing account could not be verified.');
  requireValue(normalizeHandshakeFirstName(data.first_name), 'The existing account needs a name.');
  return data;
}

// Only server-persisted message/chat/channel links count, never a supplied phone,
// display name, order number, or browser guest id by itself. Ambiguity fails closed.
async function historicalIdentity(client: Client, guestId: string, stayId: string) {
  const { data, error } = await client.from('orders')
    .select('kitchen_whapi_message_id,kitchen_whapi_chat_id,kitchen_whapi_channel_id')
    .eq('guest_user_id', guestId).eq('stay_id', stayId).eq('source_channel', 'whatsapp')
    .not('kitchen_whapi_message_id', 'is', null)
    .order('id', { ascending: true }).limit(MAX_HISTORY + 1);
  requireValue(!error, 'Could not verify previous WhatsApp orders. Please try again.', 503);
  requireValue(data?.length && data.length <= MAX_HISTORY,
    'Staff assistance is needed to verify this account’s WhatsApp number.');
  const identities = new Map<string, { chatId: string; channelId: string; phone: string }>();
  for (const row of data) {
    const chatId = String(row.kitchen_whapi_chat_id ?? '');
    const channelId = String(row.kitchen_whapi_channel_id ?? '');
    const match = /^([1-9]\d{7,14})@s\.whatsapp\.net$/.exec(chatId);
    requireValue(match && channelId && row.kitchen_whapi_message_id,
      'Previous WhatsApp identity is incomplete. Please ask for staff assistance.');
    identities.set(`${channelId}:${chatId}`, { chatId, channelId, phone: `+${match[1]}` });
  }
  requireValue(identities.size === 1,
    'This account has more than one WhatsApp identity. Please ask for staff assistance.');
  return [...identities.values()][0];
}

export async function startGuestUpgrade(client: Client, body: Record<string, unknown>) {
  const guestId = String(body.guest_user_id ?? '').trim();
  const stayId = String(body.guest_stay_id ?? '').trim();
  const location = normalizeRestaurantServiceLocation(body.table_number);
  requireValue(location, 'Choose a table or Take Away before upgrading.', 400);
  const guest = await loadGuest(client, guestId, stayId);
  await historicalIdentity(client, guestId, stayId);
  const firstName = normalizeHandshakeFirstName(guest.first_name);
  requireValue(firstName.length <= 100, 'The existing account needs a valid name.');
  const ref = issueRestaurantGuestHandshakeRef();
  const expiresAt = new Date(Date.now() + RESTAURANT_GUEST_HANDSHAKE_TTL_MINUTES * 60_000).toISOString();
  const { error } = await client.from('restaurant_guest_handshakes').insert({
    ref_hash: hashRestaurantGuestHandshakeRef(ref),
    table_number: location,
    first_name: firstName,
    status: 'pending',
    expires_at: expiresAt,
    upgrade_guest_user_id: guestId,
    upgrade_guest_stay_id: stayId,
    // Deliberately do not set bound_* before WhatsApp verification.
  });
  requireValue(!error, 'Could not start the account upgrade. Please try again.', 503);
  return { status: 'pending', ref, first_name: firstName,
    whatsapp_url: buildRestaurantHandshakeWhatsAppUrl(firstName, ref), expires_at: expiresAt };
}

export async function completeGuestUpgrade(client: Client, ref: string) {
  requireValue(verifyRestaurantGuestHandshakeRef(ref), 'Invalid verification link.', 400);
  const { data: handshake, error } = await client.from('restaurant_guest_handshakes')
    .select('id,status,table_number,first_name,match_kind,matched_stay_id,phone_e164,whatsapp_chat_id,provider_channel_id,created_at,expires_at,completed_at,upgrade_guest_user_id,upgrade_guest_stay_id,bound_guest_user_id,bound_guest_stay_id')
    .eq('ref_hash', hashRestaurantGuestHandshakeRef(ref)).maybeSingle();
  requireValue(!error, 'Could not check WhatsApp verification. Please try again.', 503);
  requireValue(handshake?.upgrade_guest_user_id && handshake.upgrade_guest_stay_id,
    'This is not an existing-account upgrade link.', 400);
  const now = Date.now();
  if (handshake.status === 'pending') {
    requireValue(Date.parse(handshake.expires_at) > now, 'This upgrade expired. Please start again.');
    return { status: 'pending' };
  }
  const completedAt = Date.parse(handshake.completed_at ?? '');
  requireValue(handshake.status === 'completed' && Number.isFinite(completedAt) &&
    completedAt <= now && completedAt >= Date.parse(handshake.created_at) &&
    now - completedAt <= RESTAURANT_GUEST_HANDSHAKE_COMPLETION_TTL_MINUTES * 60_000,
  'This upgrade expired or is not complete. Please start again.');
  requireValue(normalizeRestaurantServiceLocation(handshake.table_number) &&
    handshake.match_kind === 'walkin' && !handshake.matched_stay_id,
  'WhatsApp verification did not match the existing walk-in account.');

  const guest = await loadGuest(client, handshake.upgrade_guest_user_id, handshake.upgrade_guest_stay_id);
  requireValue(normalizeHandshakeFirstName(guest.first_name) === handshake.first_name,
    'The account name changed during verification. Please start again.');
  const identity = await historicalIdentity(client, guest.id, guest.stay_id);
  requireValue(handshake.phone_e164 === identity.phone &&
    handshake.whatsapp_chat_id === identity.chatId && handshake.provider_channel_id === identity.channelId,
  'Use the same WhatsApp number as this account’s previous orders. Your account has not been changed.');

  const bindingMatches = (row: { bound_guest_user_id: string | null; bound_guest_stay_id: string | null }) =>
    row.bound_guest_user_id === guest.id && row.bound_guest_stay_id === guest.stay_id;
  if (handshake.bound_guest_user_id || handshake.bound_guest_stay_id) {
    requireValue(bindingMatches(handshake), 'This verification is already linked to another account.');
  } else {
    const { data: bound, error: bindError } = await client.from('restaurant_guest_handshakes')
      .update({ bound_guest_user_id: guest.id, bound_guest_stay_id: guest.stay_id, bound_at: new Date(now).toISOString() })
      .eq('id', handshake.id).eq('status', 'completed')
      .eq('upgrade_guest_user_id', guest.id).eq('upgrade_guest_stay_id', guest.stay_id)
      .eq('phone_e164', identity.phone).eq('whatsapp_chat_id', identity.chatId)
      .eq('provider_channel_id', identity.channelId)
      .eq('first_name', handshake.first_name).eq('match_kind', 'walkin')
      .eq('completed_at', handshake.completed_at).is('matched_stay_id', null)
      .is('bound_guest_user_id', null).is('bound_guest_stay_id', null)
      .select('bound_guest_user_id,bound_guest_stay_id').maybeSingle();
    requireValue(!bindError, 'Could not finish the upgrade. Please retry this link.', 503);
    if (!bound) {
      // Concurrent completions may both verify. Read back the winner; never
      // overwrite another binding and never create a replacement guest.
      const { data: winner, error: readError } = await client.from('restaurant_guest_handshakes')
        .select('bound_guest_user_id,bound_guest_stay_id').eq('id', handshake.id).maybeSingle();
      requireValue(!readError && winner && bindingMatches(winner), 'Account binding conflict. Please ask for staff assistance.');
    } else {
      requireValue(bindingMatches(bound), 'Account binding conflict. Please ask for staff assistance.');
    }
  }
  return { status: 'bound', session: {
    guest_user_id: guest.id, guest_stay_id: guest.stay_id, guest_first_name: guest.first_name,
  } };
}
