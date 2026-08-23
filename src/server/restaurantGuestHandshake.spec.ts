import { describe, expect, it } from 'vitest';
import {
  buildRestaurantHandshakeWhatsAppUrl,
  hashRestaurantGuestHandshakeRef,
  issueRestaurantGuestHandshakeRef,
  verifyRestaurantGuestHandshakeRef,
} from './restaurantGuestHandshake';

const SECRET = '0123456789abcdef0123456789abcdef';

describe('restaurant guest handshake refs', () => {
  it('issues and verifies a domain-separated signed ref', () => {
    const ref = issueRestaurantGuestHandshakeRef(SECRET);
    expect(ref).toMatch(/^h1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(verifyRestaurantGuestHandshakeRef(ref, SECRET)).toBe(true);
    expect(hashRestaurantGuestHandshakeRef(ref)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects tampering and the wrong secret', () => {
    const ref = issueRestaurantGuestHandshakeRef(SECRET);
    const parts = ref.split('.');
    const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;
    expect(verifyRestaurantGuestHandshakeRef(tampered, SECRET)).toBe(false);
    expect(
      verifyRestaurantGuestHandshakeRef(
        ref,
        'abcdef0123456789abcdef0123456789',
      ),
    ).toBe(false);
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
