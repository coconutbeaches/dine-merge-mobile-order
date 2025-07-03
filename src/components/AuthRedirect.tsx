import React, { useEffect } from 'react';
import { useUserContext } from '@/context/UserContext';

interface AuthRedirectProps {
  children: React.ReactNode;
}

const AuthRedirect: React.FC<AuthRedirectProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isLoading } = useUserContext();

  useEffect(() => {
    if (!isLoading && isLoggedIn && location.pathname === '/login') {
      const returnTo = new URLSearchParams(location.search).get('returnTo') || '/';
      navigate(returnTo, { replace: true });
    }
  }, [isLoading, isLoggedIn, navigate, location.pathname, location.search]);

  // Render children only after authentication state is determined
  if (isLoading) {
    return <div>Loading authentication...</div>; // Or a proper loading spinner
  }

  return <>{children}</>;
};

export default AuthRedirect;
