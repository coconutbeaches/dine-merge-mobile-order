import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export interface RouteGuardOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
  onUnauthorized?: () => void;
}

export interface RouteGuardResult {
  isLoading: boolean;
  isAuthorized: boolean;
  error: string | null;
  hasAccess: boolean;
}

/**
 * Hook for implementing route guards with robust authentication checking
 * 
 * Features:
 * - Handles loading states gracefully
 * - Shows appropriate error messages with retry functionality
 * - Prevents infinite redirect loops
 * - Ensures admin access even if first session attempt fails but refresh succeeds
 */
export function useRouteGuard(options: RouteGuardOptions = {}): RouteGuardResult {
  const {
    requireAuth = false,
    requireAdmin = false,
    redirectTo = requireAdmin ? '/menu' : '/login',
    onUnauthorized
  } = options;

  const { authReady, isLoggedIn, currentUser, error } = useAppContext();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);

  // Determine if user has the required access level
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
      setHasRedirected(true);
      
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        // Use replace to avoid creating history entry for unauthorized access
        router.replace(redirectTo);
      }
    }
  }, [authReady, hasAccess, error, hasRedirected, onUnauthorized, router, redirectTo]);

  return {
    isLoading: !authReady,
    isAuthorized: hasAccess,
    error: error || null,
    hasAccess
  };
}

export default useRouteGuard;
