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
