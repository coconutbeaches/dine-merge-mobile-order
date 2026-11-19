// Server-only Edge helpers. No token or payload logging; injected calls are mocked in tests.
export type FinalizationInput = {
  orderId: number;
  messageId: string;
  chatId: string;
  channelId: string;
  attemptedAt: string;
  handshakeRefHash: string;
  liveAfter: string;
};
type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{data: unknown; error: unknown}> };
export async function finalizeGuestDelivery(client: RpcClient, input: FinalizationInput): Promise<boolean> {
  try {
    const result = await client.rpc('restaurant_finalize_guest_delivery_v1', {
      p_order_id: input.orderId,
      p_message_id: input.messageId,
      p_chat_id: input.chatId,
      p_channel_id: input.channelId,
      p_attempted_at: input.attemptedAt,
      p_handshake_ref_hash: input.handshakeRefHash,
      p_live_after: input.liveAfter,
    });
    return !result.error && (result.data === 'delivery_sent' || result.data === 'delivery_duplicate');
  } catch {
    return false;
  }
}
export function freshDeliveryOrder(createdAt: string, liveAfter: string, now: number): boolean {
  const valid = (s: string) => /(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s));
  return valid(createdAt) && valid(liveAfter) && Date.parse(createdAt) >= Date.parse(liveAfter) && Date.parse(createdAt) <= now;
}
export async function verifyRestaurantProvider(token: string, channel: string, phone: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!token || !/^[A-Z0-9-]+$/.test(channel) || !/^[1-9]\d{7,14}$/.test(phone)) return false;
  try {
    const response = await fetcher('https://gate.whapi.cloud/health?wakeup=false', {
      redirect: 'error',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return payload?.status?.text === 'AUTH' && payload?.channel_id === channel && payload?.user?.id === phone;
  } catch {
    return false;
  }
}
