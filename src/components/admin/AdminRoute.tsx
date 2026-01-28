'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Spinner } from '@/components/ui/spinner';
import { ErrorSplash } from '@/components/ui/error-splash';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { authReady, currentUser, error, retryAuth } = useAppContext();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Check session on mount to ensure auth state is current.
  // We use getSession() which is safe and idempotent, not refreshSession()
  // which throws an error if no session exists.
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        console.log('[AdminRoute] Checking session on mount...');
        // Use getSession() - it's safe even if no session exists
        // The middleware handles the actual token refresh via getUser()
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionErr) {
          console.error('[AdminRoute] Session check error:', sessionErr);
          setRefreshError('Failed to verify session.');
        } else if (!session) {
          console.log('[AdminRoute] No session found');
          // No error - just no session, let the auth flow handle redirect
        } else {
          console.log('[AdminRoute] Session verified successfully');
        }
      } catch (err) {
        console.error('[AdminRoute] Session check exception:', err);
        if (isMounted) {
          setRefreshError('Failed to verify session.');
        }
      } finally {
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading spinner while checking session or auth is being determined
  if (isRefreshing || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show error splash if there's a session error or auth error
  if (refreshError || error) {
    return (
      <ErrorSplash
        msg={refreshError || error || 'Session check failed. Please try again.'}
        onRetry={() => {
          setRefreshError(null);
          setIsRefreshing(true);
          retryAuth();
          // Re-check session
          supabase.auth.getSession().finally(() => {
            setIsRefreshing(false);
          });
        }}
        showRetry={true}
        retryLabel="Retry Login"
      />
    );
  }

  // Check if user is admin after auth is ready and no errors
  if (!currentUser?.role || currentUser.role !== 'admin') {
    // Use replace to avoid creating history entry for unauthorized access
    router.replace('/menu');
    return null; // Prevent flash of content during redirect
  }

  // User is authenticated and has admin role
  return <>{children}</>;
}

export default AdminRoute;
