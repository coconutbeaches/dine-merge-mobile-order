import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types/app';
import { mapSupabaseToOrderStatus } from '@/utils/orderDashboardUtils';

// This is a helper type for the data we get back from supabase
interface ProductOrder {
  profiles: {
    full_name: string;
    is_guest: boolean;
  } | null;
}

export const useProductOrders = (
  productId: string | undefined,
  customerType: string | null,
  startDate: string | null,
  endDate: string | null
) => {
  const [productName, setProductName] = useState<string>('');

  const { data: orders, isLoading, error } = useQuery<Order[], Error>({
    queryKey: ['productOrders', productId, customerType, startDate, endDate],
    queryFn: async () => {
      if (!productId) return [];

      try {
        // Fetch product name
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('name')
          .eq('id', productId)
          .single();

        if (productError) throw productError;
        setProductName(productData.name);

        // Fetch orders using the new RPC function
        const { data, error: rpcError } = await supabase.rpc('get_orders_by_product', {
          p_product_id: productId,
          p_customer_type: customerType,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        if (rpcError) throw rpcError;

        // The RPC function returns a direct array of orders.
        const mappedOrders: Order[] = data.map((item: any) => ({
          ...item,
          order_status: mapSupabaseToOrderStatus(item.order_status),
        }));
        
        return mappedOrders;
      } catch (error) {
        console.error('Failed to fetch product orders:', error);
        throw error;
      }
    },
    enabled: !!productId && !!startDate && !!endDate,
  });

  return { orders: orders || [], isLoading, productName };
};