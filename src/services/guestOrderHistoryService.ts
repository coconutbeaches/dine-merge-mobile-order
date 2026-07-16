import { GuestSession } from '@/utils/guestSession';
import { Order } from '@/types/supabaseTypes';

export async function fetchGuestOrderHistory(session: GuestSession): Promise<Order[]> {
  const response = await fetch('/api/guest/order-history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      guestUserId: session.guest_user_id,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load your orders');
  }

  return Array.isArray(payload.orders) ? payload.orders : [];
}
