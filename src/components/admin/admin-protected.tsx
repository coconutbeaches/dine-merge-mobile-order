'use client';

import React, { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FiLock } from 'react-icons/fi';

interface AdminProtectedProps {
  /**
   * Child components to render when authenticated
   */
  children: ReactNode;
}

/**
 * Admin Protected Component
 * 
 * Wraps admin pages to ensure only authenticated admin users can access them
 * Redirects unauthenticated users to the login page
 */
export default function AdminProtected({ children }: AdminProtectedProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real implementation, this would verify the admin token with the server
        // For now, just check if the admin token exists in localStorage
        const adminToken = localStorage.getItem('adminToken');
        
        // For demo purposes, accept any non-null token
        // In production, this would validate the token properly
        if (adminToken) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          // Redirect to login after a short delay
          setTimeout(() => {
            router.push('/admin/login');
          }, 100);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized message if not authenticated
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="bg-red-100 text-red-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FiLock size={24} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in as an administrator to access this page.
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  // If authenticated, render children
  return <>{children}</>;
}
