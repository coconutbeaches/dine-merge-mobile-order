import { describe, expect, it } from 'vitest';
import {
  buildRestaurantHandshakeWhatsAppUrl,
  hashRestaurantGuestHandshakeRef,
  issueRestaurantGuestHandshakeRef,
  verifyRestaurantGuestHandshakeRef,
} from './restaurantGuestHandshake';

const SECRET = '0123456789abcdef0123456789abcdef';

describe('restaurant guest handshake refs', () => {
  it('issues a short human-readable one-time ref', () => {
    const ref = issueRestaurantGuestHandshakeRef(SECRET);
    expect(ref).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    expect(verifyRestaurantGuestHandshakeRef(ref, SECRET)).toBe(true);
    expect(hashRestaurantGuestHandshakeRef(ref)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects malformed short refs', () => {
    expect(verifyRestaurantGuestHandshakeRef('ABC', SECRET)).toBe(false);
    expect(verifyRestaurantGuestHandshakeRef('ABCDE-1234', SECRET)).toBe(false);
    expect(verifyRestaurantGuestHandshakeRef('OOOOO-11111', SECRET)).toBe(false);
  });

  it('builds the exact Table 6 WhatsApp handshake copy', () => {
    const ref = issueRestaurantGuestHandshakeRef(SECRET);
    const url = new URL(buildRestaurantHandshakeWhatsAppUrl('Tyler', ref));
    expect(url.hostname).toBe('wa.me');
    expect(url.pathname).toBe('/66631457299');
    expect(url.searchParams.get('text')).toBe(
      `Hi my name is Tyler. Please send me the menu\n\nRef: ${ref}`,
    );
  });
});
