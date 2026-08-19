import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGuestOrderHistory } from './guestOrderHistoryService';
import type { GuestSession } from '@/utils/guestSession';

describe('fetchGuestOrderHistory', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends only the guest identity and does not trust the stored stay ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ orders: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const staleSession = {
      guest_user_id: '11111111-1111-4111-8111-111111111111',
      guest_first_name: 'Alex',
      guest_stay_id: 'walkin_12',
    } satisfies GuestSession;

    await fetchGuestOrderHistory(staleSession);

    expect(fetchMock).toHaveBeenCalledWith('/api/guest/order-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guestUserId: staleSession.guest_user_id,
      }),
    });
  });
});
