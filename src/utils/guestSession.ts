/**
 * Guest Session Utilities
 * 
 * Utilities for managing hotel guest sessions in localStorage.
 * Guests register once with their first name and stay_id, then their session
 * is remembered via localStorage for the duration of their stay.
 * 
 * Includes PWA standalone mode detection and session recovery.
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * GuestSession interface for managing guest user sessions
 * stay_id is either a hotel stay (e.g. '3A12') or 'walkin-<guest_user_id>' for walk-in guests
 */
export interface GuestSession {
  guest_user_id: string;
  guest_first_name: string;
  guest_stay_id: string;
}

/**
 * Detect if the app is running in standalone mode (PWA)
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for PWA standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone === true;
  
  return isStandalone;
}

/**
 * Log standalone mode status for debugging
 */
export function logStandaloneStatus(): void {
  if (typeof window === 'undefined') return;
  
  const isStandalone = isStandaloneMode();
  const displayMode = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
  const navigatorStandalone = (window.navigator as any).standalone;
  
  console.log('[PWA Debug] Standalone mode:', isStandalone);
  console.log('[PWA Debug] Display mode:', displayMode);
  console.log('[PWA Debug] Navigator standalone:', navigatorStandalone);
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

export function setTableNumber(table: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Test localStorage availability first
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage not available (private mode or disabled)');
    }
    
    localStorage.setItem('table_number_pending', table);
    console.log('[Table Number] Saved table number:', table);
  } catch (error) {
    console.warn('Failed to save table number to localStorage:', error);
    throw error; // Re-throw so calling code can handle it
  }
}

export function getTableNumber(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Test localStorage availability first
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage not available for getting table number');
      return null;
    }
    
    return localStorage.getItem('table_number_pending');
  } catch (error) {
    console.warn('Failed to get table number from localStorage:', error);
    return null;
  }
}

export async function createGuestUser({ table_number, first_name = 'Guest' }: { table_number: string; first_name?: string }): Promise<GuestSession> {
  const randomId = crypto.randomUUID();
  console.log('[createGuestUser] Creating guest user with:', { randomId, first_name, table_number });
  
  // Insert the guest user
  const { data, error } = await supabase.from('guest_users').insert({
    user_id: randomId,
    first_name,
    stay_id: 'walkin',
    table_number
  }).select();
  
  if (error) {
    console.error('[createGuestUser] Insert error:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    console.error('[createGuestUser] No data returned from insert');
    throw new Error('Failed to create guest user: no data returned');
  }
  
  const insertedUser = data[0];
  console.log('[createGuestUser] User inserted:', insertedUser);
  
  // Update stay_id to include the guest user ID
  const { data: updateData, error: updateError } = await supabase
    .from('guest_users')
    .update({ stay_id: `walkin-${insertedUser.user_id}` })
    .eq('user_id', insertedUser.user_id)
    .select();
    
  if (updateError) {
    console.error('[createGuestUser] Update error:', updateError);
    throw updateError;
  }
  
  if (!updateData || updateData.length === 0) {
    console.error('[createGuestUser] No data returned from update');
    throw new Error('Failed to update guest user: no data returned');
  }
  
  const updatedUser = updateData[0];
  console.log('[createGuestUser] User updated:', updatedUser);
  
  const session = {
    guest_user_id: updatedUser.user_id,
    guest_first_name: updatedUser.first_name,
    guest_stay_id: updatedUser.stay_id
  };
  
  try {
    saveGuestSession(session);
    setTableNumber(table_number);
    console.log('[createGuestUser] Session saved successfully:', session);
  } catch (storageError) {
    console.warn('[createGuestUser] Failed to save session to localStorage:', storageError);
    // Don't throw here - the user was created successfully in the database
  }
  
  return session;
}

export function getSession() {
  return {
    ...getGuestSession(),
    table_number: getTableNumber()
  };
}

/**
 * Get the pending table number from localStorage
 * This is used to store a scanned table number until the first order is placed
 */
export function getPendingTableNumber(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Test localStorage availability first
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage not available for getting pending table number');
      return null;
    }
    
    return localStorage.getItem('pending_table_number');
  } catch (error) {
    console.warn('Failed to get pending table number from localStorage:', error);
    return null;
  }
}

/**
 * Set the pending table number in localStorage
 * This temporarily stores the scanned table number until the first order is placed
 */
export function setPendingTableNumber(tableNumber: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Test localStorage availability first
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage not available (private mode or disabled)');
    }
    
    // Safari-compatible localStorage write
    localStorage.setItem('pending_table_number', tableNumber);
    console.log('[Table Number] Saved pending table number:', tableNumber);
  } catch (error) {
    console.warn('Failed to save pending table number to localStorage:', error);
    throw error; // Re-throw so calling code can handle it
  }
}

/**
 * Clear the pending table number from localStorage
 * This should be called after successfully placing the first order
 */
export function clearPendingTableNumber(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Test localStorage availability first
    if (!isLocalStorageAvailable()) {
      console.warn('localStorage not available for clearing pending table number');
      return;
    }
    
    localStorage.removeItem('pending_table_number');
    console.log('[Table Number] Cleared pending table number');
  } catch (error) {
    console.warn('Failed to clear pending table number from localStorage:', error);
  }
}

/**
 * Check if a pending table number exists
 */
export function hasPendingTableNumber(): boolean {
  const tableNumber = getPendingTableNumber();
  return tableNumber !== null && tableNumber.trim() !== '';
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

/**
 * Recover guest session in standalone mode
 * Attempts to restore session data if it exists in localStorage
 */
export function recoverGuestSessionInStandalone(): GuestSession | null {
  // For debugging, allow recovery in any mode
  // if (!isStandaloneMode()) {
  //   return null;
  // }

  logStandaloneStatus();
  console.log('[Session Recovery] Attempting to recover guest session in standalone mode...');

  try {
    // First try the standard getGuestSession
    let session = getGuestSession();
    
    if (session) {
      console.log('[Session Recovery] Found complete guest session:', session);
      return session;
    }

    // Fallback: try to reconstruct from individual localStorage items
    const guestId = localStorage.getItem('guest_user_id');
    const firstName = localStorage.getItem('guest_first_name');
    const stayId = localStorage.getItem('guest_stay_id');

    if (guestId && firstName && stayId) {
      session = {
        guest_user_id: guestId,
        guest_first_name: firstName,
        guest_stay_id: stayId
      };
      
      console.log('[Session Recovery] Reconstructed guest session:', session);
      
      // Re-save the session to ensure consistency
      try {
        saveGuestSession(session);
        console.log('[Session Recovery] Re-saved reconstructed session');
      } catch (saveError) {
        console.warn('[Session Recovery] Failed to re-save session:', saveError);
      }
      
      return session;
    }

    // Check if we have at least the guest_user_id for minimal session
    if (guestId) {
      console.log('[Session Recovery] Found partial session with guest_user_id:', guestId);
      return {
        guest_user_id: guestId,
        guest_first_name: firstName || 'Guest',
        guest_stay_id: stayId || 'unknown'
      };
    }

    console.log('[Session Recovery] No guest session data found');
    return null;
  } catch (error) {
    console.error('[Session Recovery] Error during recovery:', error);
    return null;
  }
}
