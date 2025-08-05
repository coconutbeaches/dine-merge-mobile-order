# Supabase Channels Inventory Report

## Executive Summary
- **Single Supabase Client**: ✅ Confirmed only one client instance in `src/integrations/supabase/client.ts`
- **Admin Dashboards**: ✅ Now working with simplified approach
- **Channel Cleanup**: ✅ All channels have proper cleanup with `removeChannel()`

## Active Channels & Lifecycle

### 1. **useFetchOrdersOptimized** (`orders-optimized`)
- **Hook**: `src/hooks/useFetchOrdersOptimized.ts`
- **Channel Name**: `orders-optimized`
- **Table**: `orders`
- **Events**: All (`*`)
- **Lifecycle**: Subscribe on mount → Unsubscribe on unmount
- **Status**: ⚠️  Currently unused (replaced with basic approach)

### 2. **useFetchOrders** (`orders-dashboard-row-level`) 
- **Hook**: `src/hooks/useFetchOrders.ts`
- **Channel Name**: `orders-dashboard-row-level`
- **Table**: `orders`
- **Events**: `INSERT`, `UPDATE`, `DELETE`
- **Lifecycle**: Subscribe on mount → Unsubscribe on unmount
- **Status**: ⚠️  Currently unused (replaced with basic approach)

### 3. **useFetchOrdersEnhanced** (`orders-enhanced-row-level`)
- **Hook**: `src/hooks/useFetchOrdersEnhanced.ts`
- **Channel Name**: `orders-enhanced-row-level`
- **Table**: `orders`
- **Events**: `INSERT`, `UPDATE`, `DELETE`
- **Lifecycle**: Subscribe on mount → Unsubscribe on unmount
- **Status**: ⚠️  Currently unused

### 4. **useUserOrders** (user-specific channels)
- **Hook**: `src/hooks/useUserOrders.ts`
- **Channel Name**: `orders-{userId}-row-level`
- **Table**: `orders`
- **Events**: `INSERT`, `UPDATE`, `DELETE`
- **Filter**: `user_id=eq.{userId}`
- **Lifecycle**: Subscribe when userId changes → Unsubscribe on cleanup
- **Status**: ✅ Active and properly managed

### 5. **useCustomerOrders** (customer-specific channels)
- **Hook**: `src/hooks/useCustomerOrders.ts`
- **Channel Name**: `customer-orders-{customerId}`
- **Table**: `orders`
- **Events**: All (`*`)
- **Filter**: `user_id=eq.{customerId}` OR `stay_id=eq.{customerId}`
- **Lifecycle**: Subscribe when customerId changes → Unsubscribe on cleanup
- **Status**: ✅ Active and properly managed

## Current Dashboard Implementation

### Admin Orders Dashboard
- **File**: `app/admin/orders/page.tsx`
- **Hook**: `useOrdersDashboard` (simplified)
- **Approach**: Basic RPC call without real-time subscriptions
- **Status**: ✅ Working

### Admin Customers Dashboard  
- **File**: `app/admin/customers/page.tsx`
- **Approach**: Direct Supabase queries without complex RPC
- **Status**: ✅ Working

## Client Instance Verification
- **Single Instance**: ✅ Only one client created in `src/integrations/supabase/client.ts`
- **Import Pattern**: Consistent `import { supabase } from '@/integrations/supabase/client'`
- **Configuration**: Proper auth settings with cookie storage

## Recommendations

1. **Channel Monitoring**: The simplified dashboards now work without real-time subscriptions, reducing channel overhead
2. **Bounded Growth**: With fewer active channels, `supabase.getChannels().length` should remain stable
3. **Future Enhancement**: If real-time updates are needed for dashboards, the existing channel implementations in the unused hooks can be reactivated

## Files Modified for Dashboard Fix
- `src/hooks/useOrdersDashboard.ts` - Simplified to basic RPC approach
- `app/admin/customers/page.tsx` - Simplified to basic queries
- Both dashboards now load properly without complex channel management
