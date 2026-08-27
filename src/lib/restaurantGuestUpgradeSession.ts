import { getGuestSession, saveGuestSession, type GuestSession } from '@/utils/guestSession';
import { getRestaurantHandshakeBrowserProof, markRestaurantHandshakeVerified } from './restaurantHandshakeSession';

export function persistGuestUpgrade(session: GuestSession, ref: string): void {
  const current = getGuestSession();
  if (!current || current.guest_user_id !== session.guest_user_id ||
    current.guest_stay_id !== session.guest_stay_id || !session.guest_first_name || !ref) {
    throw new Error('Open the upgrade in the browser for this account. The current account has not been replaced.');
  }
  saveGuestSession(session);
  markRestaurantHandshakeVerified(session, ref);
  const proof = getRestaurantHandshakeBrowserProof();
  if (proof?.handshake_ref !== ref || proof.guest_user_id !== session.guest_user_id ||
    proof.guest_stay_id !== session.guest_stay_id) {
    throw new Error('Browser storage could not save verification. Keep this page open and check again.');
  }
  // Keep the older context cache consistent, without replacing account identity.
  localStorage.setItem('guest_session', JSON.stringify({
    guest_id: session.guest_user_id, first_name: session.guest_first_name, stay_id: session.guest_stay_id,
  }));
}
