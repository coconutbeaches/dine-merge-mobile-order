# Guest Checkout Database Fix Required

## Issue
The guest checkout is failing because the database is missing the required columns:
- `guest_user_id` 
- `guest_first_name`

Error: `"Could not find the 'guest_first_name' column of 'orders' in the schema cache"`

## Solution
These columns need to be added to the `orders` table in Supabase.

### Option 1: Manual SQL (Recommended)
Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Add guest user fields to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_user_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_first_name TEXT;

-- Allow NULL for user_id for guests  
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Create index for guest_user_id for performance
CREATE INDEX IF NOT EXISTS idx_orders_guest_user_id ON public.orders(guest_user_id);

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY column_name;
```

### Option 2: Migration (if database allows)
The migration file already exists but needs to be pushed:
`supabase/migrations/20250706220136_add_guest_fields_to_orders.sql`

## Testing Steps After Fix

1. **Clear auth and create guest session in localStorage:**
   ```javascript
   localStorage.clear();
   const guestSession = {
     guest_user_id: 'guest_' + Math.random().toString(36).substr(2, 9),
     guest_first_name: 'Test Guest',
     guest_stay_id: 'stay_123'
   };
   localStorage.setItem('guest_user_id', guestSession.guest_user_id);
   localStorage.setItem('guest_first_name', guestSession.guest_first_name);
   localStorage.setItem('guest_stay_id', guestSession.guest_stay_id);
   ```

2. **Add items to cart and place order:**
   - Navigate to /menu
   - Add items to cart
   - Go to /checkout
   - Click "Place Order"
   - Verify no UUID errors
   - Check that order is created with guest fields

3. **Verify database row:**
   The order should be created with:
   - `guest_user_id`: populated with guest ID
   - `guest_first_name`: "Test Guest"  
   - `user_id`: NULL

## Expected Result
- No UUID or database errors
- Order successfully placed
- Database row contains guest information
- Normal authenticated user flow still works
- Admin flow still works

## Current Status
❌ Database columns missing - blocking guest checkout
✅ Code logic implemented correctly
✅ Frontend validation working
✅ Guest session management working
