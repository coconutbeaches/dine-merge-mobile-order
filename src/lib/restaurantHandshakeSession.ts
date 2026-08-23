const STORAGE_KEY = 'restaurant_handshake_verified_v1';

export type RestaurantHandshakeBrowserProof = {
  guest_user_id: string;
  guest_stay_id: string;
  verified_at: string;
};

export function getRestaurantHandshakeBrowserProof(): RestaurantHandshakeBrowserProof | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RestaurantHandshakeBrowserProof>;
    if (!parsed.guest_user_id || !parsed.guest_stay_id || !parsed.verified_at) return null;
    return {
      guest_user_id: parsed.guest_user_id,
      guest_stay_id: parsed.guest_stay_id,
      verified_at: parsed.verified_at,
    };
  } catch {
    return null;
  }
}

export function isRestaurantHandshakeVerifiedForSession(session: {
  guest_user_id?: string | null;
  guest_stay_id?: string | null;
} | null): boolean {
  if (!session?.guest_user_id || !session?.guest_stay_id) return false;
  const proof = getRestaurantHandshakeBrowserProof();
  return Boolean(
    proof &&
      proof.guest_user_id === session.guest_user_id &&
      proof.guest_stay_id === session.guest_stay_id,
  );
}

export function markRestaurantHandshakeVerified(session: {
  guest_user_id: string;
  guest_stay_id: string;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const proof: RestaurantHandshakeBrowserProof = {
      guest_user_id: session.guest_user_id,
      guest_stay_id: session.guest_stay_id,
      verified_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(proof));
  } catch {
    // Browser storage is only a convenience. A later scan can safely repeat
    // the WhatsApp handshake and reconstruct the session again.
  }
}
