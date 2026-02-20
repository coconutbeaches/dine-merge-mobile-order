'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Spinner } from '@/components/ui/spinner';
import { ErrorSplash } from '@/components/ui/error-splash';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { authReady, currentUser, error, retryAuth } = useAppContext();
  const router = useRouter();

  // Wait for UserContext to finish its own session check.
  // UserContext is the single source of truth for auth state —
  // do not run a second parallel getSession() here, as that creates
  // a race condition where the redundant check resolves before
  // UserContext does and incorrectly redirects away from /admin.
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

  if (!currentUser?.role || currentUser.role !== 'admin') {
    router.replace('/menu');
    return null;
  }

  return <>{children}</>;
}

export default AdminRoute;
