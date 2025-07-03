import React from 'react';
import { useUserContext } from '@/context/UserContext';

const ProtectedAdminRoute: React.FC = () => {
  const { currentUser, isLoading, isLoggedIn } = useUserContext();
  const location = useLocation();

  if (isLoading) {
    // You can return a loading spinner or a placeholder component here
    return <div>Loading user information...</div>;
  }

  if (!isLoggedIn) {
    // User is not logged in, redirect to login page
    // Pass the current location in state to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (currentUser?.role !== 'admin') {
    // User is logged in but is not an admin
    // Redirect to home page or an unauthorized page
    // For simplicity, redirecting to home page here
    return <Navigate to="/" replace />;
  }

  // User is logged in and is an admin, render the child routes
  return <Outlet />;
};

export default ProtectedAdminRoute;
