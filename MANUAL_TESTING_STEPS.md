# Manual Testing Instructions - Authentication Bug Reproduction

## Server Status
✅ **Server is running on**: http://localhost:3003

## IMPORTANT: Follow these steps exactly as written

### Step 1: Fresh Browser Session Setup
1. Open a new browser window/tab
2. Navigate to: `http://localhost:3003`
3. Open DevTools (F12) 
4. Go to **Application** tab → **Storage** → **Clear all site data**
5. Go to **Network** tab → **Clear** button
6. Go to **Console** tab → **Clear** button

### Step 2: Initial Login Test
1. Navigate to: `http://localhost:3003/login`
2. **Start HAR recording**: Network tab → **Record** button (red dot)
3. Enter valid email/password credentials
4. Click **Login**
5. **Capture**: Save HAR file as `login-success.har`
6. **Note**: What page does it redirect to after successful login?

### Step 3: User Icon Click Test (BUG SCENARIO 1)
1. After successful login, stay on whatever page you were redirected to
2. **Clear Network tab** (but keep recording)
3. **Clear Console tab**
4. Locate the **User icon** in the top-right header (looks like a person)
5. **Click the User icon**
6. **Observe**: 
   - What page does it redirect to?
   - Any console errors?
   - Network requests made?
7. **Capture**: Save HAR file as `user-icon-click-bug.har`
8. **Screenshot**: Console tab showing any errors

### Step 4: Menu Navigation Test (BUG SCENARIO 2)
1. From wherever you are after step 3, manually navigate to menu
2. **Clear Network tab** (but keep recording)
3. **Clear Console tab**
4. Type in address bar: `http://localhost:3003/menu`
5. Press Enter
6. **Wait 30 seconds** and observe:
   - Does the page load completely?
   - Does it show "Loading..." indefinitely?
   - Are there console errors?
   - Are there hanging network requests?
7. **Capture**: Save HAR file as `menu-navigation-bug.har`
8. **Screenshot**: Console tab showing any errors
9. **Screenshot**: Network tab showing any pending/failed requests

### Step 5: Authentication State Debugging
1. While on the menu page (even if hanging), open Console tab
2. Type and execute these commands one by one:
   ```javascript
   // Check local storage for auth data
   localStorage.getItem('supabase.auth.token')
   
   // Check if user context is working
   // (This might not work depending on React context)
   
   // Check for any auth-related items
   Object.keys(localStorage).filter(key => key.includes('auth') || key.includes('user') || key.includes('supabase'))
   ```
3. **Capture**: Screenshot of the console output

## Expected vs Actual Results

### User Icon Click
- **Expected**: Should go to `/profile` (admin) or `/order-history` (regular user)
- **Suspected Bug**: Redirects to `/login` instead

### Menu Navigation  
- **Expected**: Menu loads with categories and products
- **Suspected Bug**: Page hangs in loading state

## Key Things to Look For

### In Console:
- "Auth still loading, waiting..."
- "Guest session found, allowing access"
- "No guest session and not authenticated"
- Any error messages related to authentication
- React context errors
- Supabase authentication errors

### In Network Tab:
- Failed authentication requests
- Requests to `/auth/` endpoints
- Supabase API calls
- Any requests that are pending/hanging
- 401 or 403 status codes

### In Local Storage:
- Supabase session tokens
- User profile data
- Guest session information

## Files to Save
Please save these files for analysis:
1. `login-success.har`
2. `user-icon-click-bug.har` 
3. `menu-navigation-bug.har`
4. Screenshots of console errors (if any)
5. Screenshots of network requests (if any hanging/failed)

## Additional Debug Information
Also capture:
- Browser type and version
- Current time when tests were performed
- Any other unusual behavior noticed

---

## Quick Test Completion Checklist:
- [ ] Fresh browser session created
- [ ] Login performed successfully
- [ ] User icon clicked and behavior noted
- [ ] Menu navigation tested and behavior noted
- [ ] HAR files saved
- [ ] Console logs captured
- [ ] Screenshots taken of any errors

**Total estimated time**: 10-15 minutes
