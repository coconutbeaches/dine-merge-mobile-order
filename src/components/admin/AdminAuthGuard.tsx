'use client';

import React from 'react';
import { AdminRoute } from '@/components/admin/AdminRoute';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

/**
 * AdminAuthGuard ensures only admin users can access protected routes.
 * 
 * Features:
 * - Robust authentication checking with fallback handling
 * - Graceful loading states
 * - Error handling with retry functionality
 * - Prevents infinite redirect loops
 * - Ensures admin access even if first session attempt fails but refresh succeeds
 */
export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({ children }) => {
  return (
    <AdminRoute>
      {children}
    </AdminRoute>
  );
};
