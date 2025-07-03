
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export const useSupabaseAuth = (onProfileFetch: (userId: string) => Promise<void>) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to store the callback to prevent dependency issues
  const onProfileFetchRef = useRef(onProfileFetch);
  onProfileFetchRef.current = onProfileFetch;

  const lastUserIdRef = useRef<string | null>(null);



  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!isMounted) return;
      console.log('[useSupabaseAuth] Auth state change:', event, session);
      const newUserId = session?.user?.id ?? '';
      if (newUserId !== lastUserIdRef.current) {
        setSupabaseSession(session ?? null);
        setSupabaseUser(session?.user ?? null);
        await onProfileFetchRef.current(newUserId);
        lastUserIdRef.current = newUserId;
      }
      if (isMounted) {
        setIsLoading(false);
        console.log('[useSupabaseAuth] Loading complete.');
      }
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
    };
  }, []); // Empty dependency array since we use ref for onProfileFetch

  return { supabaseUser, supabaseSession, isLoading };
}
