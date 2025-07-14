'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { Spinner } from '@/components/ui/spinner';
import { ErrorSplash } from '@/components/ui/error-splash';

interface AuthRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function AuthRoute({ children, redirectTo = '/login' }: AuthRouteProps) {
  const { authReady, isLoggedIn, error, retryAuth } = useAppContext();
  const router = useRouter();

  // Show loading spinner while auth is being determined
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

  // Show error splash if there's an auth error and retry is needed
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

  // Check if user is logged in after auth is ready and no errors
  if (!isLoggedIn) {
    // Use replace to avoid creating history entry for unauthorized access
    router.replace(redirectTo);
    return null; // Prevent flash of content during redirect
  }

  // User is authenticated
  return <>{children}</>;
}

export default AuthRoute;
