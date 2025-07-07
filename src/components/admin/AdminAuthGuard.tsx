'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children }) => {
  const { currentUser, isLoading, isLoggedIn } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // Redirect if not logged in
    if (!isLoggedIn) {
      console.log('[AdminAuthGuard] User not logged in, redirecting to login');
      router.push('/login');
      return;
    }

    // Redirect if not admin
    if (currentUser?.role !== 'admin') {
      console.log('[AdminAuthGuard] User is not admin, redirecting to menu');
      router.push('/menu');
      return;
    }

    console.log('[AdminAuthGuard] Admin access granted');
  }, [currentUser, isLoading, isLoggedIn, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isLoggedIn || currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        <span className="ml-2">Checking permissions...</span>
      </div>
    );
  }

  // User is authenticated and is admin
  return <>{children}</>;
};
