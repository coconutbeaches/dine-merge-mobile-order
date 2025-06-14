
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/supabaseTypes';

// Using a local CartItem type to handle potentially numeric IDs from old orders
interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface EnrichedOrder extends Omit<Order, 'order_items'> {
  order_items: CartItem[];
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
      
      const items = (Array.isArray(orderData.order_items) ? orderData.order_items : []) as CartItem[];
      if (items.length > 0) {
        const productIds = items.map(item => item.id).filter(Boolean);
        if (productIds.length > 0) {
          // Assuming old orders refer to menu_items with numeric IDs
          const { data: productsData, error: productsError } = await supabase
            .from('menu_items')
            .select('id, name, image_url, price')
            .in('id', productIds as any[]);

          if (productsError) {
            console.error('Error fetching product details from menu_items:', productsError);
          } else if (productsData) {
            const productMap = new Map(productsData.map(p => [p.id, p]));
            const enrichedItems = items.map(item => {
              const productDetails = productMap.get(item.id);
              return {
                ...item,
                name: productDetails?.name || item.name || 'Unknown Product',
                price: productDetails?.price ?? item.price ?? 0,
                image_url: productDetails?.image_url || item.image_url,
              };
            });
            orderData.order_items = enrichedItems as any;
          }
        }
      }

      if (orderData.total_amount === 0 && orderData.order_items) {
        const calculatedTotal = (orderData.order_items as CartItem[]).reduce((total, item) => {
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
        ...(orderData as Omit<Order, 'order_items'>),
        customer_name_from_profile: profileData?.name || null,
        customer_email_from_profile: profileData?.email || null,
        order_items: (Array.isArray(orderData.order_items) ? orderData.order_items : []) as CartItem[],
      };
      
      return enrichedData;
    },
    enabled: !!orderId,
  });

  return { order, isLoading, error };
};
