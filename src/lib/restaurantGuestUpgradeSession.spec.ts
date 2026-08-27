import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGuestSession, saveGuestSession } from '@/utils/guestSession';
import { getRestaurantHandshakeBrowserProof } from './restaurantHandshakeSession';
import { persistGuestUpgrade } from './restaurantGuestUpgradeSession';

const old = { guest_user_id: 'existing', guest_stay_id: 'walkin-existing', guest_first_name: 'Kung' };
const upgraded = { ...old, guest_first_name: 'KUNG STAFF' };

describe('upgrade browser session', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('preserves the account and cart while refreshing the name and exact binding proof', () => {
    saveGuestSession(old);
    localStorage.setItem('cart', '["keep"]');
    persistGuestUpgrade(upgraded, 'ABCDE-FGHJK');
    expect(getGuestSession()).toEqual(upgraded);
    expect(getRestaurantHandshakeBrowserProof()).toMatchObject({
      guest_user_id: old.guest_user_id, guest_stay_id: old.guest_stay_id,
      binding_version: 2, handshake_ref: 'ABCDE-FGHJK',
    });
    expect(localStorage.getItem('cart')).toBe('["keep"]');
    expect(JSON.parse(localStorage.getItem('guest_session')!)).toEqual({
      guest_id: old.guest_user_id, stay_id: old.guest_stay_id, first_name: 'KUNG STAFF',
    });
  });
  it('refuses a different or missing browser account without replacing it', () => {
    expect(() => persistGuestUpgrade(upgraded, 'ref')).toThrow('browser');
    saveGuestSession(old);
    expect(() => persistGuestUpgrade({ ...upgraded, guest_user_id: 'other' }, 'ref')).toThrow('browser');
    expect(() => persistGuestUpgrade({ ...upgraded, guest_stay_id: 'other' }, 'ref')).toThrow('browser');
    expect(getGuestSession()).toEqual(old);
    expect(getRestaurantHandshakeBrowserProof()).toBeNull();
  });
  it('does not report success if browser proof cannot be stored', () => {
    saveGuestSession(old);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'restaurant_handshake_verified_v1') throw new Error('storage full');
      return original.call(this, key, value);
    });
    expect(() => persistGuestUpgrade(upgraded, 'ref')).toThrow('Browser storage');
    expect(getGuestSession()?.guest_user_id).toBe(old.guest_user_id);
  });
});
