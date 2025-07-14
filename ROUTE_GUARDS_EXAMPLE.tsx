// Example usage of the robust route guards

import React from 'react';
import { AdminRoute, AuthRoute, useRouteGuard } from '@/components/guards';
import { toast } from 'sonner';

// Example 1: Basic admin route protection
export function AdminDashboard() {
  return (
    <AdminRoute>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p>This content is only visible to admin users.</p>
        <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded">
          <h2 className="font-semibold text-green-800">Features:</h2>
          <ul className="mt-2 text-sm text-green-700">
            <li>• Shows loading spinner while auth is being determined</li>
            <li>• Shows error splash with retry if auth fails</li>
            <li>• Redirects to /menu if user is not admin</li>
            <li>• Prevents flash of unauthorized content</li>
            <li>• Ensures admin access even if first session fails but refresh succeeds</li>
          </ul>
        </div>
      </div>
    </AdminRoute>
  );
}

// Example 2: General user authentication
export function UserProfile() {
  return (
    <AuthRoute redirectTo="/login">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">User Profile</h1>
        <p>This content requires authentication but not admin privileges.</p>
        <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded">
          <h2 className="font-semibold text-blue-800">Features:</h2>
          <ul className="mt-2 text-sm text-blue-700">
            <li>• Redirects to custom login page if not authenticated</li>
            <li>• Graceful loading and error states</li>
            <li>• No endless "Redirecting..." states</li>
          </ul>
        </div>
      </div>
    </AuthRoute>
  );
}

// Example 3: Using the hook for custom logic
export function CustomProtectedPage() {
  const { isLoading, hasAccess, error } = useRouteGuard({
    requireAdmin: true,
    onUnauthorized: () => {
      toast.error('Admin access required');
      // Could also show a modal, redirect elsewhere, etc.
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Custom Protected Page</h1>
      <p>This page uses the useRouteGuard hook for custom authentication logic.</p>
      <div className="mt-4 p-4 bg-purple-100 border border-purple-300 rounded">
        <h2 className="font-semibold text-purple-800">Hook Features:</h2>
        <ul className="mt-2 text-sm text-purple-700">
          <li>• Custom onUnauthorized callback</li>
          <li>• Full control over loading, error, and unauthorized states</li>
          <li>• Flexible authentication and authorization logic</li>
          <li>• Can be used in any component for conditional rendering</li>
        </ul>
      </div>
    </div>
  );
}

// Example 4: Demonstration of the sample AdminRoute component
export function AdminRouteExample() {
  return (
    <AdminRoute>
      <div className="p-6 bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-bold mb-6 text-center">Admin Route Example</h1>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-green-600">✅ Implementation Complete</h2>
            <p className="text-gray-700 mb-4">
              This AdminRoute component follows the exact pattern from the sample:
            </p>
            
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <pre className="text-sm overflow-x-auto">
{`export function AdminRoute({ children }) {
  const { loading, user, error } = useAuth();
  if (loading) return <Spinner />;
  if (error) return <ErrorSplash msg="Auth error, retrying…" />;
  if (!user?.isAdmin) {
    router.replace('/menu');
    return null;
  }
  return children;
}`}
              </pre>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-semibold text-blue-800 mb-2">🔄 Loading State</h3>
                <p className="text-sm text-blue-700">
                  Shows clean spinner while authReady is false
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded">
                <h3 className="font-semibold text-red-800 mb-2">❌ Error Handling</h3>
                <p className="text-sm text-red-700">
                  Shows ErrorSplash with retry when auth fails
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded">
                <h3 className="font-semibold text-yellow-800 mb-2">🛡️ Authorization</h3>
                <p className="text-sm text-yellow-700">
                  Redirects to /menu if user is not admin
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <h3 className="font-semibold text-green-800 mb-2">⚡ No Flash</h3>
                <p className="text-sm text-green-700">
                  Returns null during redirect to prevent content flash
                </p>
              </div>
            </div>
            
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded">
              <h3 className="font-semibold text-emerald-800 mb-2">🎯 Key Benefits</h3>
              <ul className="text-sm text-emerald-700 space-y-1">
                <li>• Ensures admin access even if first session attempt fails but refresh succeeds</li>
                <li>• No endless "Redirecting…" state</li>
                <li>• Graceful error handling with retry functionality</li>
                <li>• Prevents infinite redirect loops</li>
                <li>• Uses router.replace() to avoid history pollution</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}

export default AdminRouteExample;
