import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Simplified order type that works with current database structure
interface ProductOrder {
  id: string;
  user_id: string | null;
  created_at: string;
  order_status: string;
  total_amount: number;
  customer_name: string;
  customer_type: string;
}

export const useProductOrders = (
  productId: string | undefined,
  customerType: string | null,
  startDate: string | null,
  endDate: string | null
) => {
  const [productName, setProductName] = useState<string>('');

  const { data: orders, isLoading, error } = useQuery<ProductOrder[], Error>({
    queryKey: ['productOrders', productId, customerType, startDate, endDate],
    queryFn: async () => {
      if (!productId) return [];

      try {
        // Fetch product name from products table
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('name')
          .eq('id', productId)
          .single();

        if (productError) {
          console.error('Product not found:', productError);
          setProductName('Unknown Product');
        } else {
          setProductName(productData.name);
        }

        // Since the current database has a limited orders table, 
        // we'll create a simplified query that works with available data
        // Get all orders first, then filter by date range
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            user_id,
            total_amount,
            created_at,
            order_items,
            profiles!inner (
              name,
              customer_type
            )
          `)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        
        console.log('Raw orders data:', ordersData?.slice(0, 3)); // Debug log
        console.log('Filtering for product ID:', productId);

        // Filter orders by date range and product ID if provided
        let filteredOrders = ordersData || [];

        // Filter by date range
        if (startDate && endDate) {
          filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.created_at);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return orderDate >= start && orderDate <= end;
          });
        }

        console.log('Orders after date filtering:', filteredOrders.length);

        // Filter orders that contain specific product ID
        filteredOrders = filteredOrders.filter(order => {
          // Ensure order_items exists and is an array
          if (!order.order_items || !Array.isArray(order.order_items)) {
            console.log('Order', order.id, 'has no order_items or not an array');
            return false;
          }
          // Check if any item in the order has the matching product ID
          const hasProduct = order.order_items.some((item: any) => {
            console.log('Checking item ID:', item.id, 'against product ID:', productId);
            return item.id === productId;
          });
          console.log('Order', order.id, 'has matching product:', hasProduct);
          return hasProduct;
        });

        console.log('Orders after product filtering:', filteredOrders.length);

        // Transform the data to match expected format
        const transformedOrders: ProductOrder[] = filteredOrders
          .filter(order => order && order.id) // Filter out null/undefined orders
          .map((order: any) => {
            console.log('Processing order:', { id: order.id, type: typeof order.id }); // Debug log
            return {
              id: String(order.id || ''), // Ensure ID is a string with fallback
              user_id: order.user_id || null,
              created_at: order.created_at || new Date().toISOString(),
              order_status: 'new', // Default since status column doesn't exist
              total_amount: order.total_amount || 0,
              customer_name: order.profiles?.name || 'Unknown Customer',
              customer_type: order.profiles?.customer_type || 'hotel_guest'
            };
          });

        // Filter by customer type if specified
        if (customerType) {
          const filtered = transformedOrders.filter(order => {
            if (customerType === 'guest') {
              return order.customer_type === 'hotel_guest';
            } else if (customerType === 'non-guest') {
              return order.customer_type === 'non_guest';
            }
            return true;
          });
          return filtered;
        }

        return transformedOrders;
      } catch (error) {
        console.error('Failed to fetch product orders:', error);
        throw error;
      }
    },
    enabled: !!productId,
  });

  return { orders: orders || [], isLoading, productName };
};