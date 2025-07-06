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
 * Test if localStorage is available (Safari private mode compatibility)
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, 'test');
    localStorage.removeItem(test);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the current guest session from localStorage
 */
export function getGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Test localStorage availability first (Safari private mode check)
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage not available (private mode or disabled)');
      return null;
    }
    
    // Safari-compatible localStorage access
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
  } catch (error) {
    console.warn('localStorage not available:', error);
    return null;
  }
  
  return null;
}

/**
 * Save guest session to localStorage
 */
export function saveGuestSession(session: GuestSession): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Test localStorage availability first
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage not available (private mode or disabled)');
    }
    
    // Safari-compatible localStorage writes
    localStorage.setItem('guest_user_id', session.guest_user_id);
    localStorage.setItem('guest_first_name', session.guest_first_name);
    localStorage.setItem('guest_stay_id', session.guest_stay_id);
  } catch (error) {
    console.warn('Failed to save guest session to localStorage:', error);
    throw error; // Re-throw so calling code can handle it
  }
}

/**
 * Clear guest session from localStorage
 */
export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Test localStorage availability first
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage not available for clearing session');
      return;
    }
    
    // Safari-compatible localStorage removal
    localStorage.removeItem('guest_user_id');
    localStorage.removeItem('guest_first_name');
    localStorage.removeItem('guest_stay_id');
  } catch (error) {
    console.warn('Failed to clear guest session from localStorage:', error);
  }
}

/**
 * Get the registration URL for the guest's stay_id
 * Falls back to /register/unknown if no stay_id is found
 */
export function getRegistrationUrl(): string {
  const guestSession = getGuestSession();
  let storedStayId = guestSession?.guest_stay_id;
  
  // Fallback to direct localStorage access with error handling
  if (!storedStayId) {
    try {
      if (isLocalStorageAvailable()) {
        storedStayId = localStorage.getItem('guest_stay_id');
      }
    } catch (error) {
      console.warn('localStorage not available for getRegistrationUrl:', error);
    }
  }
  
  return storedStayId ? `/register/${storedStayId}` : '/register/unknown';
}

/**
 * Check if a guest session exists
 */
export function hasGuestSession(): boolean {
  return getGuestSession() !== null;
}

/**
 * Check if the current user is a hotel guest (has stay_id)
 * This helper determines user type for routing decisions
 */
export function isHotelGuest(): boolean {
  const guestSession = getGuestSession();
  return guestSession !== null && !!guestSession.guest_stay_id;
}
