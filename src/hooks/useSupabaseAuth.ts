
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

export const useSupabaseAuth = (onProfileFetch: (userId: string) => Promise<void>) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    // Always use setTimeout to avoid using `await` in the callback
    const authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      console.log('[useSupabaseAuth] Auth state change:', event, session);
      setSupabaseSession(session ?? null);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => { onProfileFetch(session.user.id); }, 0);
      }
      else {
        setTimeout(() => { onProfileFetch(''); }, 0);
      }
    });
    authSubscription = authListener.data.subscription;

    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[useSupabaseAuth] Error getting session:", error);
        }
        setSupabaseSession(session ?? null);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          await onProfileFetch(session.user.id); // This is allowed, we are inside an async function
        } else {
          await onProfileFetch('');
        }
      } catch (e) {
        console.error("[useSupabaseAuth] Exception during initial session check:", e);
      }
      if (isMounted) {
        setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, [onProfileFetch]);

  return { supabaseUser, supabaseSession, isLoading };
}
