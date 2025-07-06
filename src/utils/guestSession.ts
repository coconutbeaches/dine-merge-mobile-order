/**
 * Guest Session Utilities
 * 
 * Utilities for managing hotel guest sessions in localStorage.
 * Guests register once with their first name and stay_id, then their session
 * is remembered via localStorage for the duration of their stay.
 */

export interface GuestSession {
  guest_user_id: string;
  guest_first_name: string;
  guest_stay_id: string;
}

/**
 * Get the current guest session from localStorage
 */
export function getGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null;
  
  const guest_user_id = localStorage.getItem('guest_user_id');
  const guest_first_name = localStorage.getItem('guest_first_name');
  const guest_stay_id = localStorage.getItem('guest_stay_id');
  
  if (guest_user_id && guest_first_name && guest_stay_id) {
    return {
      guest_user_id,
      guest_first_name,
      guest_stay_id
    };
  }
  
  return null;
}

/**
 * Save guest session to localStorage
 */
export function saveGuestSession(session: GuestSession): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('guest_user_id', session.guest_user_id);
  localStorage.setItem('guest_first_name', session.guest_first_name);
  localStorage.setItem('guest_stay_id', session.guest_stay_id);
}

/**
 * Clear guest session from localStorage
 */
export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('guest_user_id');
  localStorage.removeItem('guest_first_name');
  localStorage.removeItem('guest_stay_id');
}

/**
 * Get the registration URL for the guest's stay_id
 * Falls back to /register/unknown if no stay_id is found
 */
export function getRegistrationUrl(): string {
  const guestSession = getGuestSession();
  const storedStayId = guestSession?.guest_stay_id || localStorage.getItem('guest_stay_id');
  return storedStayId ? `/register/${storedStayId}` : '/register/unknown';
}

/**
 * Check if a guest session exists
 */
export function hasGuestSession(): boolean {
  return getGuestSession() !== null;
}
