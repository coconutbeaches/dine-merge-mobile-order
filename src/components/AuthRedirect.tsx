 'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useUserContext } from '@/context/UserContext';

interface AuthRedirectProps {
  children: React.ReactNode;
}

const AuthRedirect: React.FC<AuthRedirectProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoggedIn, isLoading } = useUserContext();

  useEffect(() => {
    if (!isLoading && isLoggedIn && pathname === '/login') {
  const returnTo = searchParams?.get('returnTo') || '/';
      router.replace(returnTo);
    }
  }, [isLoading, isLoggedIn, pathname, searchParams, router]);

  // Render children only after authentication state is determined
  if (isLoading) {
    return <div>Loading authentication...</div>; // Or a proper loading spinner
  }

  return <>{children}</>;
};

export default AuthRedirect;
