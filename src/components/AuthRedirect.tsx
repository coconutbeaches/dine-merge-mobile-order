import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserContext } from '@/context/UserContext';

interface AuthRedirectProps {
  children: React.ReactNode;
}

const AuthRedirect: React.FC<AuthRedirectProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { supabaseSession, isLoading: isAuthLoading } = useSupabaseAuth(() => Promise.resolve());
  const { isLoading: isUserLoading } = useUserContext();

  useEffect(() => {
    if (!isAuthLoading && !isUserLoading) {
      // If there's a session and the user is on the login page, redirect them
      if (supabaseSession && location.pathname === '/login') {
        const returnTo = new URLSearchParams(location.search).get('returnTo') || '/';
        navigate(returnTo, { replace: true });
      }
    }
  }, [supabaseSession, isAuthLoading, isUserLoading, navigate, location.pathname, location.search]);

  // Render children only after authentication state is determined
  if (isAuthLoading || isUserLoading) {
    return <div>Loading authentication...</div>; // Or a proper loading spinner
  }

  return <>{children}</>;
};

export default AuthRedirect;
