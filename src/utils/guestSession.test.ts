import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGuestUser, getGuestSession } from './guestSession';

describe('createGuestUser (server-mediated registration)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to /api/guest/register and persists the returned session in localStorage', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        guest_user_id: 'guest-123',
        first_name: 'Bouke',
        stay_id: 'Beach_House_Rypma',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const session = await createGuestUser({
      table_number: 'Beach_House_Rypma',
      first_name: 'Bouke',
      stay_id: 'Beach_House_Rypma',
    });

    // Called the server route, never the Supabase table directly.
    expect(fetchMock).toHaveBeenCalledWith('/api/guest/register', expect.objectContaining({ method: 'POST' }));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ first_name: 'Bouke', stay_id: 'Beach_House_Rypma', table_number: 'Beach_House_Rypma' });

    // Preserves the existing GuestSession shape.
    expect(session).toEqual({
      guest_user_id: 'guest-123',
      guest_first_name: 'Bouke',
      guest_stay_id: 'Beach_House_Rypma',
    });

    // localStorage keys are unchanged so existing sessions stay compatible.
    expect(localStorage.getItem('guest_user_id')).toBe('guest-123');
    expect(localStorage.getItem('guest_first_name')).toBe('Bouke');
    expect(localStorage.getItem('guest_stay_id')).toBe('Beach_House_Rypma');
    expect(localStorage.getItem('table_number_pending')).toBe('Beach_House_Rypma');

    expect(getGuestSession()).toEqual(session);
  });

  it('throws with the server-provided error message on a failed registration', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'This stay already has the maximum number of registered guests. Please ask our staff for help.' }),
      }),
    );

    await expect(
      createGuestUser({ table_number: '1', first_name: 'Nora', stay_id: 'FULL_STAY' }),
    ).rejects.toThrow('maximum number of registered guests');

    expect(localStorage.getItem('guest_user_id')).toBeNull();
  });
});
