import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, CartItem, ExtendedOrder } from '@/types/app';
import { mapSupabaseToOrderStatus } from '@/utils/orderDashboardUtils';
import { calculateTotalPrice } from '@/utils/productUtils';
import { formatStayId } from '@/lib/utils';

interface EnrichedOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  optionsString?: string;
  originalCartItem: CartItem;
}

interface EnrichedOrder extends Omit<ExtendedOrder, 'order_items'> {
  order_items: EnrichedOrderItem[];
}

export const useFetchOrderById = (orderId: string | undefined) => {
  const { data: order, isLoading, error, refetch } = useQuery<EnrichedOrder | null, Error>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) {
        throw new Error('No order ID provided');
      }

      // Validate order ID format
      const parsedOrderId = parseInt(orderId, 10);
      if (isNaN(parsedOrderId) || parsedOrderId <= 0) {
        throw new Error('Invalid order ID format');
      }

      try {
        // Readback goes through an authorized server route (service role) so a
        // guest can only read their own order and no anonymous 15-minute
        // cross-guest SELECT policy is needed. Guest ownership is proven with
        // the guest_user_id from localStorage; authenticated users and admins
        // are authorized via their session cookie server-side.
        let guestUserId = '';
        try {
          if (typeof window !== 'undefined') {
            guestUserId = window.localStorage.getItem('guest_user_id') || '';
          }
        } catch {
          // localStorage may be unavailable (private mode) — proceed without it.
        }

        const query = guestUserId ? `?guestUserId=${encodeURIComponent(guestUserId)}` : '';
        const response = await fetch(`/api/orders/${parsedOrderId}${query}`, {
          headers: { Accept: 'application/json' },
        });

        if (response.status === 404) {
          throw new Error('Order not found');
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || `Database error: failed to load order (${response.status})`);
        }

        const { order: orderData } = await response.json();

        if (!orderData) {
          throw new Error('Order not found');
        }
      
      const items = (Array.isArray(orderData.order_items) ? orderData.order_items : []) as unknown as CartItem[];
      
      const enrichedItems: EnrichedOrderItem[] = items.map(item => {
        if (!item.menuItem) {
          // Fallback for any older data structures without menuItem
          return {
            id: item.id,
            name: (item as any).name || (item as any).product || 'Unknown Product',
            price: (item as any).price || 0,
            quantity: item.quantity,
            image_url: (item as any).image_url,
            originalCartItem: item,
          };
        }
        
        const unitPriceWithOptions = calculateTotalPrice(item.menuItem, item.selectedOptions || {});
        
        const optionsString = item.selectedOptions
            ? Object.values(item.selectedOptions).flat().filter(Boolean).join(', ')
            : '';

        return {
          id: item.id,
          name: item.menuItem.name,
          price: unitPriceWithOptions,
          quantity: item.quantity,
          image_url: item.menuItem.image,
          optionsString,
          originalCartItem: item,
        };
      });

      if (orderData.total_amount === 0 && enrichedItems.length > 0) {
        const calculatedTotal = enrichedItems.reduce((total, item) => {
            return total + (item.price || 0) * (item.quantity || 1);
        }, 0);
        if (calculatedTotal > 0) {
            orderData.total_amount = calculatedTotal;
        }
      }

      let profileData = null;
      if (orderData.user_id) {
        try {
          const { data: pData, error: profileError } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', orderData.user_id)
            .single();

          if (profileError) {
            console.warn(`Profile not found for user ${orderData.user_id}:`, profileError);
            // Don't throw here - missing profile is not critical
          } else {
            profileData = pData;
          }
        } catch (profileFetchError) {
          console.warn('Non-critical error fetching user profile:', profileFetchError);
          // Continue without profile data
        }
      }

      const formattedStayId = formatStayId(orderData.stay_id, orderData.table_number);
      
      const enrichedData: EnrichedOrder = {
        id: orderData.id,
        user_id: orderData.user_id || undefined,
        guest_user_id: orderData.guest_user_id || undefined,
        guest_first_name: orderData.guest_first_name || undefined,
        total_amount: orderData.total_amount,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
        table_number: orderData.table_number || undefined,
        customer_name: orderData.customer_name || undefined,
        order_status: orderData.order_status ? mapSupabaseToOrderStatus(orderData.order_status) : 'new',
        customer_name_from_profile: profileData?.name || undefined,
        customer_email_from_profile: profileData?.email || undefined,
        order_items: enrichedItems,
        formattedStayId,
        stay_id: orderData.stay_id || undefined,
      };
      
      return enrichedData;
      } catch (fetchError) {
        console.error('Error in order fetch operation:', fetchError);
        // Re-throw with appropriate error type
        if (fetchError instanceof Error) {
          throw fetchError;
        }
        throw new Error('An unexpected error occurred while fetching the order');
      }
    },
    enabled: !!orderId,
    retry: (failureCount, error) => {
      // Don't retry for certain types of errors
      if (error?.message?.includes('not found') || 
          error?.message?.includes('Invalid order ID') ||
          error?.message?.includes('No order ID provided')) {
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30 * 1000, // 30 seconds for specific orders
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  return { 
    order, 
    isLoading, 
    error, 
    refetch,
    retry: () => refetch()
  };
};
