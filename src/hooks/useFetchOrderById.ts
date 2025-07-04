import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, CartItem } from '@/types/app';
import { mapSupabaseToOrderStatus } from '@/utils/orderDashboardUtils';
import { calculateTotalPrice } from '@/utils/productUtils';

interface EnrichedOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
  optionsString?: string;
  originalCartItem: CartItem;
}

interface EnrichedOrder extends Omit<Order, 'order_items'> {
  order_items: EnrichedOrderItem[];
}

export const useFetchOrderById = (orderId: string | undefined) => {
  const { data: order, isLoading, error } = useQuery<EnrichedOrder | null, Error>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', parseInt(orderId, 10))
        .maybeSingle();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        throw orderError;
      }

      if (!orderData) {
        return null;
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
        const { data: pData, error: profileError } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', orderData.user_id)
          .single();

        if (profileError) {
          console.error(`Error fetching profile for user ${orderData.user_id}:`, profileError);
        } else {
          profileData = pData;
        }
      }

      const enrichedData: EnrichedOrder = {
        id: orderData.id,
        user_id: orderData.user_id || undefined,
        total_amount: orderData.total_amount,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
        table_number: orderData.table_number || undefined,
        customer_name: orderData.customer_name || undefined,
        order_status: orderData.order_status ? mapSupabaseToOrderStatus(orderData.order_status) : 'new',
        customer_name_from_profile: profileData?.name || undefined,
        customer_email_from_profile: profileData?.email || undefined,
        order_items: enrichedItems,
      };
      
      return enrichedData;
    },
    enabled: !!orderId,
  });

  return { order, isLoading, error };
};
