# Bug Reproduction Guide - Authentication Redirect Issue

## Environment Setup
- **Application URL**: http://localhost:3003 (or the port Next.js is running on)
- **Build**: Current development branch (not main/production)
- **Date**: 2025-07-13

## Bug Description
After performing a fresh email/password login:
1. Clicking the user icon redirects to `/login` instead of expected profile/user page
2. Navigating directly to `/menu` causes a hanging state

## Reproduction Steps

### Prerequisites
1. Start the development server: `npm run dev`
2. Open browser to `http://localhost:3003`
3. Open DevTools (F12) - **Network** and **Console** tabs
4. **Important**: Clear all local storage and cookies to ensure fresh state

### Step 1: Perform Fresh Login
1. Navigate to `/login` page
2. Use valid email/password credentials to log in
3. **Capture**: Record HAR file during login process
4. **Capture**: Note any console errors/warnings during login
5. Verify successful login (should redirect to expected page)

### Step 2: Test User Icon Click (Bug Scenario 1)
1. After successful login, locate the user icon in the header (top right)
2. **Start recording**: Begin HAR capture in Network tab
3. **Click the user icon**
4. **Expected**: Should navigate to profile/user page  
5. **Actual**: Redirects to `/login` page
6. **Capture**: Save HAR file as `user-icon-redirect-bug.har`
7. **Capture**: Screenshot console errors/logs
8. **Capture**: Note the URL path it redirects to

### Step 3: Direct Menu Navigation (Bug Scenario 2)
1. With the user still logged in, navigate directly to `/menu` by typing in address bar
2. **Start recording**: Begin HAR capture in Network tab
3. **Navigate to**: `http://localhost:3003/menu`
4. **Expected**: Menu should load normally
5. **Actual**: Page hangs/loading state persists
6. **Capture**: Save HAR file as `menu-hanging-bug.har`
7. **Capture**: Screenshot console errors/logs
8. **Capture**: Note any failed network requests
9. **Wait time**: Observe for at least 30 seconds to confirm hanging state

## Key Files to Examine
Based on code analysis, the bug likely involves:
- `/src/components/layout/Header.tsx` - User icon click handler (lines 81-99)
- `/src/context/UserContext.tsx` - Authentication state management
- `/app/menu/page.tsx` - Menu page loading logic
- `/src/components/AuthRedirect.tsx` - Authentication redirect logic

## Authentication Flow Analysis
The user icon click logic (Header.tsx lines 81-99) has this flow:
```typescript
// Unified user-icon routing logic - only run on client
if (!isClient) return;

const isGuest = isHotelGuest();

if (!isLoggedIn && !isGuest) {
  // Not logged in and not a hotel guest -> login
  router.push('/login');
} else if (isLoggedIn && currentUser?.role === 'admin') {
  // Admin users -> profile page
  router.push('/profile');
} else {
  // Hotel guests (with stay_id) and regular customers -> order history
  router.push('/order-history');
}
```

## Expected vs Actual Behavior

### User Icon Click
- **Expected**: Logged-in user should go to `/profile` (if admin) or `/order-history` (if regular user)
- **Actual**: Redirects to `/login` suggesting `isLoggedIn` is false despite successful login

### Menu Page Access
- **Expected**: Menu should load showing categories and products
- **Actual**: Page hangs, likely in loading state checking authentication

## Debug Information to Capture

### Console Logs
Look for these specific log messages:
- Authentication state logs from `useUserContext`
- Menu page logs: "Auth still loading, waiting..."
- Menu page logs: "Guest session found, allowing access"
- Any errors related to `isLoggedIn` or `currentUser` state

### Network Requests
Monitor for:
- Authentication-related API calls
- Supabase session checks
- Menu data fetching requests (categories, products)
- Any failed or hanging requests

### Local Storage
Check these items:
- Supabase session data
- Guest session information
- Any authentication tokens

## Files for HAR Export
Save the following files for analysis:
1. `user-icon-redirect-bug.har` - Network traffic when clicking user icon
2. `menu-hanging-bug.har` - Network traffic when navigating to menu
3. `console-logs-user-icon.txt` - Console output during user icon click
4. `console-logs-menu-hanging.txt` - Console output during menu navigation

## Next Steps
After capturing the above data:
1. Compare with working production behavior
2. Analyze authentication state management
3. Review the timing of authentication checks
4. Check for race conditions in auth state initialization
