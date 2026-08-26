import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRestaurantHandshakeBrowserProof,
  getRestaurantHandshakeBrowserProof,
  isRestaurantHandshakeVerifiedForSession,
  markRestaurantHandshakeVerified,
} from './restaurantHandshakeSession';

describe('restaurant handshake browser proof', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists the exact handshake ref used for Table 6 delivery', () => {
    const session = {
      guest_user_id: 'guest-123',
      guest_stay_id: 'walkin-123',
    };

    markRestaurantHandshakeVerified(session, 'ABCDE-FGHIJ');

    expect(getRestaurantHandshakeBrowserProof()).toEqual(
      expect.objectContaining({
        guest_user_id: 'guest-123',
        guest_stay_id: 'walkin-123',
        handshake_ref: 'ABCDE-FGHIJ',
      }),
    );
    expect(isRestaurantHandshakeVerifiedForSession(session)).toBe(true);
  });

  it('keeps pre-rollout proofs valid without inventing a handshake ref', () => {
    localStorage.setItem(
      'restaurant_handshake_verified_v1',
      JSON.stringify({
        guest_user_id: 'guest-old',
        guest_stay_id: 'walkin-old',
        verified_at: '2026-08-25T00:00:00.000Z',
      }),
    );

    const proof = getRestaurantHandshakeBrowserProof();
    expect(proof?.handshake_ref).toBeUndefined();
    expect(
      isRestaurantHandshakeVerifiedForSession({
        guest_user_id: 'guest-old',
        guest_stay_id: 'walkin-old',
      }),
    ).toBe(true);
  });

  it('clears a previous guest proof before a fresh Table 6 QR handshake', () => {
    const oldSession = {
      guest_user_id: 'guest-alvaro-old',
      guest_stay_id: 'walkin-alvaro-old',
    };

    markRestaurantHandshakeVerified(oldSession, 'ABCDE-FGHIJ');
    expect(isRestaurantHandshakeVerifiedForSession(oldSession)).toBe(true);

    clearRestaurantHandshakeBrowserProof();

    expect(getRestaurantHandshakeBrowserProof()).toBeNull();
    expect(isRestaurantHandshakeVerifiedForSession(oldSession)).toBe(false);
  });
});
