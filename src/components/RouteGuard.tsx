'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Spinner } from '@/components/ui/spinner';
import { ErrorSplash } from '@/components/ui/error-splash';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  fallbackComponent?: React.ComponentType<{ error?: string }>;
}

/**
 * RouteGuard provides robust client-side route protection with fallback handling.
 * 
 * Features:
 * - Graceful loading states
 * - Error handling with retry functionality
 * - Prevents infinite redirect loops
 * - Ensures access even if first session attempt fails but refresh succeeds
 * - No endless "Redirecting…" state
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requireAuth = false, 
  requireAdmin = false, 
  redirectTo = '/login',
  fallbackComponent: FallbackComponent 
}) => {
  const { currentUser, isLoggedIn, authReady, error, retryAuth } = useAppContext();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  // Determine if user has required access
  const hasAccess = (() => {
    if (!authReady) return false; // Still loading
    if (error) return false; // Auth error occurred
    if (requireAuth && !isLoggedIn) return false; // Auth required but not logged in
    if (requireAdmin && (!currentUser?.role || currentUser.role !== 'admin')) return false; // Admin required but not admin
    return true; // All checks passed
  })();

  // Handle redirects for unauthorized access
  useEffect(() => {
    if (!authReady || hasRedirected) return;

    if (!hasAccess && !error) {
      // User is not authorized and there's no error - redirect
      console.log('[RouteGuard] Access denied, redirecting to:', redirectTo);
      setHasRedirected(true);
      // Use replace to avoid creating history entry for unauthorized access
      router.replace(redirectTo);
    }
  }, [authReady, hasAccess, error, hasRedirected, router, redirectTo]);

  // Show loading while auth is being determined
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Spinner />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed and custom fallback is provided
  if (error && FallbackComponent) {
    return <FallbackComponent error={error} />;
  }

  // Show default error state if authentication failed
  if (error) {
    return (
      <ErrorSplash 
        msg="Session check failed. Please try again." 
        onRetry={retryAuth}
        showRetry={true}
        retryLabel="Retry Login"
      />
    );
  }

  // Don't show anything while redirecting to prevent flash of content
  if (!hasAccess) {
    return null;
  }

  // User has access
  return <>{children}</>;
};
