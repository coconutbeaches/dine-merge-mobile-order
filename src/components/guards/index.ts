// Route Guards - Robust client-side authentication and authorization

export { RouteGuard } from '@/components/RouteGuard';
export { AdminRoute } from '@/components/admin/AdminRoute';
export { AuthRoute } from '@/components/auth/AuthRoute';
export { AdminAuthGuard } from '@/components/admin/AdminAuthGuard';
export { useRouteGuard } from '@/hooks/useRouteGuard';

// UI Components for loading and error states
export { Spinner } from '@/components/ui/spinner';
export { ErrorSplash } from '@/components/ui/error-splash';

// Type definitions
export type { RouteGuardOptions, RouteGuardResult } from '@/hooks/useRouteGuard';

/**
 * Usage Examples:
 * 
 * // Basic admin route protection
 * <AdminRoute>
 *   <AdminDashboard />
 * </AdminRoute>
 * 
 * // General authenticated route protection
 * <AuthRoute redirectTo="/login">
 *   <UserProfile />
 * </AuthRoute>
 * 
 * // Using the hook for custom logic
 * const { isLoading, hasAccess, error } = useRouteGuard({
 *   requireAdmin: true,
 *   onUnauthorized: () => toast('Admin access required')
 * });
 * 
 * // Flexible route guard with custom fallback
 * <RouteGuard 
 *   requireAuth={true} 
 *   requireAdmin={false}
 *   redirectTo="/menu"
 *   fallbackComponent={CustomErrorComponent}
 * >
 *   <ProtectedContent />
 * </RouteGuard>
 */
