# Enhanced SessionManager with Exponential Backoff Retry

## Overview

The SessionManager has been enhanced with robust retry logic that implements exponential backoff and offline awareness to improve authentication reliability.

## Key Features

### 1. Exponential Backoff Retry Pattern

The session check now retries up to 3 times with increasing delays:
- **First retry**: 250ms delay
- **Second retry**: 750ms delay  
- **Third retry**: 1.5s delay

```typescript
const sessionData = await getSessionWithTimeout(supabase, { 
  timeout: 3000, 
  enableExponentialBackoff: true 
});
```

### 2. Offline Awareness

The system detects when the device is offline using `navigator.onLine` and:
- Aborts retries immediately if starting offline
- Stops retries if the device goes offline during retry attempts
- Throws `SessionRetryExhaustedError` with offline-specific messaging

### 3. Retry Exhausted Error Handling

A new error type `SessionRetryExhaustedError` is thrown when:
- All retry attempts are exhausted
- Device is offline during retry attempts
- Maximum retry count is reached

```typescript
try {
  const session = await getSessionWithTimeout(supabase, { enableExponentialBackoff: true });
} catch (error) {
  if (error instanceof SessionRetryExhaustedError) {
    // Show retry UI
    setShouldShowRetryButton(true);
  }
}
```

### 4. Retry Login UI

When session retry is exhausted, the system shows a "Retry Login" button that:
- Allows users to manually retry authentication
- Uses the same exponential backoff logic
- Is integrated into existing error splash components

## Implementation Details

### SessionManager Changes

**File**: `utils/sessionManager.ts`

- Added `enableExponentialBackoff` option to `SessionManagerOptions`
- Created `SessionRetryExhaustedError` class for specific error handling
- Enhanced retry logic with exponential backoff timing
- Added offline detection and abort logic
- Improved error context and logging

### UserContext Integration

**File**: `src/context/UserContext.tsx`

- Added `shouldShowRetryButton` state to control retry UI
- Added `retryAuth` function to manually retry authentication
- Enhanced error handling to detect `SessionRetryExhaustedError`
- Updated initialization to use exponential backoff by default

### UI Components

**Updated Components**:
- `src/components/auth/AuthRoute.tsx`
- `src/components/admin/AdminRoute.tsx`
- `src/components/RouteGuard.tsx`
- `src/components/ui/error-splash.tsx`

All route guard components now:
- Display appropriate error messages for retry scenarios
- Show "Retry Login" button when retry is exhausted
- Use manual retry function instead of page reload

## Usage Examples

### Basic Usage (Exponential Backoff Enabled)

```typescript
import { getSessionWithTimeout } from '@/utils/sessionManager';

try {
  const sessionData = await getSessionWithTimeout(supabase, { 
    timeout: 3000, 
    enableExponentialBackoff: true 
  });
  // Handle successful session
} catch (error) {
  if (error instanceof SessionRetryExhaustedError) {
    // All retries exhausted - show retry UI
    showRetryButton();
  } else {
    // Other error - handle accordingly
    handleError(error);
  }
}
```

### Using UserContext Retry

```typescript
import { useUserContext } from '@/context/UserContext';

const { error, shouldShowRetryButton, retryAuth } = useUserContext();

if (error && shouldShowRetryButton) {
  return (
    <button onClick={retryAuth}>
      Retry Login
    </button>
  );
}
```

### Route Protection with Retry

```typescript
import { AuthRoute } from '@/components/auth/AuthRoute';

<AuthRoute>
  <ProtectedContent />
</AuthRoute>
// Automatically handles retry UI when session fails
```

## Error Scenarios Handled

1. **Network Timeout**: Retries with exponential backoff
2. **Supabase Service Unavailable**: Retries with exponential backoff
3. **Device Offline**: Immediately fails with offline error
4. **Goes Offline During Retry**: Aborts remaining retries
5. **Session Expired**: Attempts refresh, then retries if refresh fails

## Testing

A test script is provided at `test-session-retry.js` to verify:
- Exponential backoff timing
- Offline detection
- Success on retry
- Error handling

Run with: `node test-session-retry.js`

## Benefits

1. **Improved Reliability**: Handles transient network issues gracefully
2. **Better User Experience**: Clear retry options instead of hard failures
3. **Offline Awareness**: Doesn't waste battery on futile retries
4. **Progressive Delays**: Reduces server load with exponential backoff
5. **Comprehensive Error Handling**: Specific error types for different scenarios

## Configuration Options

```typescript
interface SessionManagerOptions {
  timeout?: number;                    // Default: 3000ms
  retries?: number;                    // Default: 1 (legacy mode)
  enableExponentialBackoff?: boolean;  // Default: false
}
```

When `enableExponentialBackoff` is true:
- Ignores `retries` option
- Uses fixed 3-attempt retry pattern
- Uses exponential backoff delays (250ms, 750ms, 1.5s)

## Backward Compatibility

The enhanced SessionManager maintains backward compatibility:
- Existing code continues to work with linear backoff
- New exponential backoff is opt-in via `enableExponentialBackoff: true`
- All existing error handling patterns remain valid
