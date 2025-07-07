
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { isStandaloneMode, logStandaloneStatus } from '@/utils/guestSession';

export const useSupabaseAuth = (onProfileFetch: (userId: string) => Promise<void>) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to store the callback to prevent dependency issues
  const onProfileFetchRef = useRef(onProfileFetch);
  onProfileFetchRef.current = onProfileFetch;

  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;

    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!isMounted) return;
      console.log('[useSupabaseAuth] Auth state change:', event, session);
      setSupabaseSession(session ?? null);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        await onProfileFetchRef.current(session.user.id);
      } else {
        await onProfileFetchRef.current('');
      }

      if (isMounted) {
        setIsLoading(false);
        console.log('[useSupabaseAuth] Loading complete.');
      }
    };

    // Check for session in standalone mode
    const checkStandaloneSession = async () => {
      if (isStandaloneMode()) {
        logStandaloneStatus();
        console.log('[useSupabaseAuth] Checking standalone session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Re-register or re-initiate session in case it's missing
          const guestId = localStorage.getItem('guest_user_id');
          if (guestId) {
            console.log('[useSupabaseAuth] Found guest ID in localStorage, re-registering session...');
            // (Re-login logic or prompt user here as needed)
          }
        }
      }
    };
    checkStandaloneSession();

    // Set up session refresh to prevent timeouts
    const setupSessionRefresh = () => {
      // Refresh session every 50 minutes (Supabase default is 60 minutes)
      refreshInterval = setInterval(async () => {
        try {
          console.log('[useSupabaseAuth] Refreshing session...');
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('[useSupabaseAuth] Session refresh error:', error);
          } else {
            console.log('[useSupabaseAuth] Session refreshed successfully');
          }
        } catch (err) {
          console.error('[useSupabaseAuth] Session refresh exception:', err);
        }
      }, 50 * 60 * 1000); // 50 minutes
    };

    // Perform initial session check and set up listener
    (async () => {
      console.log('[useSupabaseAuth] Performing initial session check and setting up listener...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[useSupabaseAuth] Error getting initial session:", error);
        }
        await handleAuthChange('INITIAL_SESSION', session);

        // Set up auth state change listener after initial check
        const { data: listener } = supabase.auth.onAuthStateChange(handleAuthChange);
        authSubscription = listener.subscription;

        // Set up session refresh if user is logged in
        if (session?.user) {
          setupSessionRefresh();
        }

      } catch (e) {
        console.error("[useSupabaseAuth] Exception during initial session check:", e);
        if (isMounted) {
          setIsLoading(false);
          console.log('[useSupabaseAuth] Loading complete (due to error).');
        }
      }
    })();

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []); // Empty dependency array since we use ref for onProfileFetch

  return { supabaseUser, supabaseSession, isLoading };
}
