'use client';
import { useAppContext } from '@/context/AppContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useEffect } from 'react';

/**
 * Debug component to observe AppContext values and the relationship between
 * supabaseSession, currentUser, and isLoggedIn
 */
export const AppContextDebugger = () => {
  const appContext = useAppContext();
  const { supabaseSession, supabaseUser, isLoading } = useSupabaseAuth(() => Promise.resolve());

  useEffect(() => {
    // Create debug object on window for easy access in browser console
    const debugData = {
      // App context values
      isLoggedIn: appContext.isLoggedIn,
      currentUser: appContext.currentUser,
      isLoading: appContext.isLoading,
      
      // Supabase auth values
      supabaseSession: supabaseSession,
      supabaseUser: supabaseUser,
      supabaseAuthLoading: isLoading,
      
      // Key insight: isLoggedIn can be false even when supabaseSession exists
      // This happens when currentUser is null but supabaseSession exists
      hasSession: !!supabaseSession,
      hasCurrentUser: !!appContext.currentUser,
      sessionButNoUser: !!supabaseSession && !appContext.currentUser,
      
      // Timestamps for debugging
      timestamp: new Date().toISOString(),
      
      // Helper to refresh debug data
      refresh: () => {
        console.log('🔄 AppContext Debug Data:', {
          isLoggedIn: appContext.isLoggedIn,
          currentUser: appContext.currentUser,
          supabaseSession: supabaseSession,
          hasSession: !!supabaseSession,
          hasCurrentUser: !!appContext.currentUser,
          sessionButNoUser: !!supabaseSession && !appContext.currentUser,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Expose to window for browser console access
    (window as any).__dbg = debugData;

    // Log the debug data to console
    console.log('🐛 AppContext Debug Data:', debugData);

    // Check for the specific scenario we're interested in
    if (!!supabaseSession && !appContext.currentUser) {
      console.warn('⚠️ FOUND SCENARIO: supabaseSession exists but currentUser is null');
      console.warn('This would cause isLoggedIn to be false even with a valid session');
    }

  }, [appContext.isLoggedIn, appContext.currentUser, supabaseSession, supabaseUser, isLoading]);

  // Don't render anything visible - this is just for debugging
  return null;
};
