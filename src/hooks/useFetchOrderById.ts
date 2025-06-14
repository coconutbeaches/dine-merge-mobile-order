
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

      // First, fetch the order data
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
      
      // Enrich order items with product names
      const items = (Array.isArray(orderData.order_items) ? orderData.order_items : []) as unknown as CartItem[];
      if (items.length > 0) {
        const productIds = items.map(item => item.id).filter(Boolean);
        if (productIds.length > 0) {
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('id, name, image_url')
            .in('id', productIds);

          if (productsError) {
            console.error('Error fetching product details:', productsError);
          } else if (productsData) {
            const productMap = new Map(productsData.map(p => [p.id, p]));
            const enrichedItems = items.map(item => {
              const productDetails = productMap.get(item.id);
              return {
                ...item,
                name: productDetails?.name || item.name,
                image_url: productDetails?.image_url || item.image_url,
              };
            });
            orderData.order_items = enrichedItems as any;
          }
        }
      }

      let profileData = null;
      // If the order has a user_id, fetch the corresponding profile
      if (orderData.user_id) {
        const { data: pData, error: profileError } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', orderData.user_id)
          .single();

        if (profileError) {
          console.error(`Error fetching profile for user ${orderData.user_id}:`, profileError);
          // Not throwing error here, just means we won't have profile data
        } else {
          profileData = pData;
        }
      }

      // Combine order data with profile data
      const enrichedData: EnrichedOrder = {
        ...(orderData as Omit<Order, 'order_items'>),
        customer_name_from_profile: profileData?.name || null,
        customer_email_from_profile: profileData?.email || null,
        order_items: (Array.isArray(orderData.order_items) ? orderData.order_items : []) as unknown as CartItem[],
      };
      
      return enrichedData;
    },
    enabled: !!orderId,
  });

  return { order, isLoading, error };
};

