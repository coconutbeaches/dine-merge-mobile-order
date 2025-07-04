# Cart Badge Issue Investigation & Documentation

## Overview
This document captures the investigation of cart badge visibility issues in the Next.js App Router migration branch. The investigation was conducted on July 4, 2025.

## Current Implementation Analysis

### Cart Badge Logic (Header.tsx)
```typescript
// Line 22 in /src/components/layout/Header.tsx
const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

// Lines 67-71 in Header.tsx - Badge rendering
{totalItems > 0 && (
  <span className="absolute -top-1 -right-1 bg-restaurant-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
    {totalItems}
  </span>
)}
```

### Context Structure
The app uses a multi-layer context provider structure:
1. **AppContextProvider** wraps: UserProvider > CartProvider > OrderProvider > AppProvider
2. **CartContext** manages cart state with localStorage persistence
3. **AppContext** aggregates all contexts (cart, user, orders) for easy consumption

### Cart State Management
- Cart state is managed in `CartContext.tsx`
- Persists to localStorage automatically
- Calculates totals correctly
- Badge count uses `cart.reduce((total, item) => total + item.quantity, 0)`

## Testing Methodology

### Development Environment
- Next.js 15.3.5 running on http://localhost:3001
- App Router architecture with client components
- Current branch: `nextjs-app-router-migration`

### Test Scenarios Executed

#### 1. Adding Items to Cart
**Expected Behavior:**
- Navigate to `/menu`
- Click on menu item to go to detail page (`/menu/item/[id]`)
- Configure options and quantity
- Click "Add to Cart"
- Badge should appear with correct count

**Actual Testing:**
- ✅ Menu page loads correctly with categories and products
- ✅ Menu item detail pages accessible via click
- ✅ Add to cart functionality works (confirmed via toast notifications)
- ⚠️ **ISSUE IDENTIFIED**: Need to verify badge visibility on header after add

#### 2. Cart Badge Visibility States
**States to Test:**
- Empty cart (count = 0): Badge should be hidden
- Cart with items (count > 0): Badge should be visible with correct number
- After removing all items: Badge should disappear

#### 3. Navigation & Persistence
**Test Scenarios:**
- Add items to cart, navigate between pages
- Reload browser page
- Badge should persist due to localStorage implementation

## Potential Issues Identified

### 1. Hydration Mismatch
**Symptoms:** Badge may flash or disappear on page load
**Cause:** Server-side render shows empty cart, client hydrates with localStorage data
**Evidence to look for:** Console hydration warnings

### 2. Context Provider Order
**Current Order:** UserProvider > CartProvider > OrderProvider > AppProvider
**Potential Issue:** If UserContext loading state affects CartContext localStorage loading

### 3. CSS/Styling Issues
**Badge Classes:** 
```css
"absolute -top-1 -right-1 bg-restaurant-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
```
**Potential Issues:**
- `bg-restaurant-primary` color not defined
- Z-index conflicts
- Badge positioned incorrectly

### 4. Cart Loading Race Condition
**In CartProvider (lines 35-41):**
```typescript
useEffect(() => {
  const storedCart = localStorage.getItem('cart');
  if (storedCart) {
    setCart(JSON.parse(storedCart));
  }
}, []);
```
**Issue:** No loading state during cart restoration from localStorage

## Console Warnings to Monitor

### Expected Hydration Warnings
Look for messages like:
- "Warning: Text content did not match. Server: "" Client: "2""
- "Warning: Expected server HTML to contain a matching element"
- Any React hydration-related warnings

### Network/Data Loading
- Supabase connection issues
- Failed product/category queries
- Cart persistence failures

## Steps for Reproducing Issues

### Scenario 1: Fresh Load with Items
1. Clear browser localStorage
2. Navigate to `/menu`
3. Add multiple items to cart
4. Check if badge appears immediately
5. Reload page
6. Verify badge persists with correct count

### Scenario 2: Empty Cart State
1. Clear cart (remove all items)
2. Verify badge disappears (totalItems = 0)
3. Navigate between pages
4. Confirm badge stays hidden

### Scenario 3: Cross-Page Navigation
1. Add items to cart from menu
2. Navigate to `/cart` page
3. Navigate back to `/menu`
4. Verify badge count remains accurate

## Next Steps for Testing

### Manual Browser Testing Required
Since this is a visual UI component issue, manual testing in browser is essential:

1. **Open browser to http://localhost:3001**
2. **Test each scenario systematically**
3. **Capture screenshots of:**
   - Badge visible state with items
   - Badge hidden state (empty cart)
   - Any visual glitches or positioning issues
4. **Monitor browser console for:**
   - Hydration warnings
   - JavaScript errors
   - React warnings

### Automated Testing Considerations
- Consider adding Playwright tests for cart badge visibility
- Test cart persistence across page reloads
- Verify badge updates in real-time as items are added/removed

## Implementation Notes

### Key Files Involved
- `/src/components/layout/Header.tsx` - Badge rendering
- `/src/context/CartContext.tsx` - Cart state management  
- `/src/context/AppContext.tsx` - Context aggregation
- `/app/menu/item/[id]/MenuItemClient.tsx` - Add to cart functionality

### Badge Dependencies
- Requires `useAppContext()` hook
- Depends on `cart` array from CartContext
- Uses `totalItems` calculation for display logic
- Styled with Tailwind CSS classes

## Conclusion

The cart badge implementation appears architecturally sound based on code review. The most likely issues are:

1. **Hydration mismatches** causing badge to flash or disappear
2. **CSS styling issues** with `bg-restaurant-primary` color
3. **Race conditions** in localStorage cart restoration

**Recommendation:** Proceed with manual browser testing to capture visual evidence of the specific badge behavior issues.
