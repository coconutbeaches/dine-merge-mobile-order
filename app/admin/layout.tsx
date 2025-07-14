'use client';

import { AdminRoute } from '@/components/admin/AdminRoute';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminRoute>
      {children}
    </AdminRoute>
  );
}
