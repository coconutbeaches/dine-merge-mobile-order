# Robust Client-Side Route Guards

This implementation provides comprehensive client-side route protection with fallback handling, following the pattern requested in the sample code.

## Key Features

### 🔒 **Admin Route Protection**
- Ensures **admin** access even if the first session attempt fails but the refresh succeeds
- No endless "Redirecting…" state
- Graceful error handling with retry functionality
- Prevents infinite redirect loops

### 🚀 **Loading States**
- Clean spinner component for loading states
- Prevents flash of unauthorized content
- Handles auth initialization gracefully

### 🔄 **Error Handling**
- Robust error splash component with retry functionality
- Graceful fallback when authentication fails
- User-friendly error messages

### 🛡️ **Security Features**
- Uses `router.replace()` to prevent history pollution
- Prevents unauthorized content flash
- Handles edge cases in authentication flow

## Components

### AdminRoute
```tsx
export function AdminRoute({ children }) {
  const { authReady, currentUser, error } = useAppContext();
  const router = useRouter();

  if (!authReady) return <Spinner />;
  if (error) return <ErrorSplash msg="Auth error, retrying…" />;
  if (!currentUser?.isAdmin) {
    router.replace('/menu');
    return null;
  }
  return children;
}
```

### AuthRoute
```tsx
<AuthRoute redirectTo="/login">
  <UserProfile />
</AuthRoute>
```

### RouteGuard (General)
```tsx
<RouteGuard 
  requireAuth={true} 
  requireAdmin={false}
  redirectTo="/menu"
  fallbackComponent={CustomErrorComponent}
>
  <ProtectedContent />
</RouteGuard>
```

### useRouteGuard Hook
```tsx
const { isLoading, hasAccess, error } = useRouteGuard({
  requireAdmin: true,
  onUnauthorized: () => toast('Admin access required')
});
```

## Usage Examples

### 1. Admin Dashboard Protection
```tsx
import { AdminRoute } from '@/components/guards';

export default function AdminDashboard() {
  return (
    <AdminRoute>
      <div>Admin Only Content</div>
    </AdminRoute>
  );
}
```

### 2. General User Authentication
```tsx
import { AuthRoute } from '@/components/guards';

export default function UserProfile() {
  return (
    <AuthRoute redirectTo="/login">
      <div>User Profile Content</div>
    </AuthRoute>
  );
}
```

### 3. Custom Route Protection Logic
```tsx
import { useRouteGuard } from '@/components/guards';

function CustomProtectedPage() {
  const { isLoading, hasAccess, error } = useRouteGuard({
    requireAdmin: true,
    onUnauthorized: () => {
      toast.error('Admin access required');
      // Custom handling
    }
  });

  if (isLoading) return <CustomLoader />;
  if (error) return <CustomErrorPage />;
  if (!hasAccess) return <UnauthorizedPage />;

  return <AdminContent />;
}
```

## Implementation Details

### Authentication Flow
1. **Loading State**: Shows spinner while `authReady` is false
2. **Error Handling**: Shows error splash with retry if authentication fails
3. **Authorization Check**: Validates user role after successful authentication
4. **Redirect**: Uses `router.replace()` to redirect unauthorized users
5. **Content Render**: Shows protected content only after all checks pass

### Error Recovery
- Automatic retry functionality in error splash
- Graceful handling of session refresh failures
- No infinite redirect loops
- Prevents "Redirecting…" loading states

### Security Considerations
- Uses `router.replace()` instead of `router.push()` to prevent history pollution
- Returns `null` during redirects to prevent content flash
- Validates both authentication state and user roles
- Handles edge cases in authentication flow

## File Structure

```
src/
├── components/
│   ├── guards/
│   │   └── index.ts              # Exports and examples
│   ├── admin/
│   │   ├── AdminRoute.tsx        # Admin-specific route guard
│   │   └── AdminAuthGuard.tsx    # Legacy wrapper (updated)
│   ├── auth/
│   │   └── AuthRoute.tsx         # General auth route guard
│   ├── ui/
│   │   ├── spinner.tsx           # Loading spinner component
│   │   └── error-splash.tsx      # Error display component
│   └── RouteGuard.tsx            # Flexible route guard
└── hooks/
    └── useRouteGuard.ts          # Route guard hook
```

## Migration Guide

### From Old AdminAuthGuard
```tsx
// Old
<AdminAuthGuard>
  <AdminContent />
</AdminAuthGuard>

// New (automatically updated)
<AdminAuthGuard>
  <AdminContent />
</AdminAuthGuard>
```

### From Old RouteGuard
```tsx
// Old
<RouteGuard requireAuth={true} requireAdmin={true}>
  <AdminContent />
</RouteGuard>

// New (improved with better error handling)
<RouteGuard requireAuth={true} requireAdmin={true}>
  <AdminContent />
</RouteGuard>
```

## Testing

The route guards handle the following scenarios:
- ✅ Initial loading state
- ✅ Authentication errors with retry
- ✅ Unauthorized access redirection
- ✅ Successful authentication flow
- ✅ Role-based access control
- ✅ Session refresh handling
- ✅ Prevention of infinite redirects

## Benefits

1. **Reliability**: Handles authentication edge cases gracefully
2. **User Experience**: Clean loading states and error messages
3. **Security**: Prevents unauthorized content access
4. **Maintainability**: Consistent pattern across all protected routes
5. **Flexibility**: Multiple components for different use cases
6. **Performance**: Efficient redirect handling without history pollution
