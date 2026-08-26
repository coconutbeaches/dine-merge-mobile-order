import { beforeEach, describe, expect, it } from 'vitest';
import {
  getRestaurantHandshakeBrowserProof,
  isRestaurantHandshakeVerifiedForSession,
  markRestaurantHandshakeVerified,
} from './restaurantHandshakeSession';

describe('restaurant handshake browser proof', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists the exact handshake ref and durable binding version', () => {
    const session = {
      guest_user_id: 'guest-123',
      guest_stay_id: 'walkin-123',
    };

    markRestaurantHandshakeVerified(session, 'ABCDE-FGHIJ');

    expect(getRestaurantHandshakeBrowserProof()).toEqual(
      expect.objectContaining({
        guest_user_id: 'guest-123',
        guest_stay_id: 'walkin-123',
        binding_version: 2,
        handshake_ref: 'ABCDE-FGHIJ',
      }),
    );
    expect(isRestaurantHandshakeVerifiedForSession(session)).toBe(true);
  });

  it('forces one fresh handshake for legacy unbound browser proofs', () => {
    localStorage.setItem(
      'restaurant_handshake_verified_v1',
      JSON.stringify({
        guest_user_id: 'guest-old',
        guest_stay_id: 'walkin-old',
        verified_at: '2026-08-25T00:00:00.000Z',
        handshake_ref: 'ABCDE-FGHIJ',
      }),
    );

    expect(
      isRestaurantHandshakeVerifiedForSession({
        guest_user_id: 'guest-old',
        guest_stay_id: 'walkin-old',
      }),
    ).toBe(false);
  });
});
