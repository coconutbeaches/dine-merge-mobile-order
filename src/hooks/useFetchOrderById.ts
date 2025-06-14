
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/supabaseTypes';

// Extend Order to include order_items with product details
interface OrderWithDetails extends Order {
  order_items: {
    quantity: number;
    products: {
      name: string;
      price: number;
    } | null;
  }[];
}

export const useFetchOrderById = (orderId: string | undefined) => {
  const { data: order, isLoading, error } = useQuery<OrderWithDetails | null, Error>({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            products ( name, price )
          )
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }
      
      return data;
    },
    enabled: !!orderId,
  });

  return { order, isLoading, error };
};
