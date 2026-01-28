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

  // Proactively refresh session on mount to ensure cookies are fresh.
  // This prevents the 2-minute auth failure where server-side cookies expire
  // but client-side localStorage still has valid tokens.
  useEffect(() => {
    let isMounted = true;

    const refreshSession = async () => {
      try {
        console.log('[AdminRoute] Refreshing session on mount...');
        const { data, error: refreshErr } = await supabase.auth.refreshSession();

        if (!isMounted) return;

        if (refreshErr) {
          console.error('[AdminRoute] Session refresh error:', refreshErr);
          // If refresh fails with a specific auth error, clear state
          if (refreshErr.message?.includes('refresh_token') ||
              refreshErr.message?.includes('session') ||
              refreshErr.message?.includes('expired')) {
            setRefreshError('Session expired. Please log in again.');
          }
        } else {
          console.log('[AdminRoute] Session refreshed successfully');
        }
      } catch (err) {
        console.error('[AdminRoute] Session refresh exception:', err);
        if (isMounted) {
          setRefreshError('Failed to verify session.');
        }
      } finally {
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    };

    refreshSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading spinner while refreshing session or auth is being determined
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

  // Show error splash if there's a refresh error or auth error
  if (refreshError || error) {
    return (
      <ErrorSplash
        msg={refreshError || error || 'Session check failed. Please try again.'}
        onRetry={() => {
          setRefreshError(null);
          setIsRefreshing(true);
          retryAuth();
          // Also trigger a session refresh
          supabase.auth.refreshSession().finally(() => {
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
