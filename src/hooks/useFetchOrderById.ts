
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, CartItem } from '@/types/supabaseTypes';

// Define a more specific type for the order details
interface EnrichedOrder extends Omit<Order, 'order_items'> {
  order_items: CartItem[];
}

export const useFetchOrderById = (orderId: string | undefined) => {
  const { data: order, isLoading, error } = useQuery<EnrichedOrder | null, Error>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles ( name, email )
        `)
        .eq('id', parseInt(orderId, 10))
        .maybeSingle();

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }
      
      if (!data) {
        return null;
      }

      const orderData = data as any;

      const enrichedData: EnrichedOrder = {
        ...orderData,
        customer_name_from_profile: orderData.profiles?.name || null,
        customer_email_from_profile: orderData.profiles?.email || null,
        order_items: Array.isArray(orderData.order_items) ? orderData.order_items : [],
      };
      
      return enrichedData;
    },
    enabled: !!orderId,
  });

  return { order, isLoading, error };
};
