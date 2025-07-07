import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OptimizedOrder {
  id: string;
  user_id: string | null;
  guest_user_id: string | null;
  guest_first_name: string | null;
  stay_id: string | null;
  total_amount: number;
  created_at: string;
  customer_name: string;
  customer_email: string | null;
  customer_type: string;
  // Add UI-expected fields with defaults
  order_status: 'new';
  order_items: any[];
  updated_at: string;
  special_instructions: null;
  customer_name_from_profile: string;
  customer_email_from_profile: string | null;
}

export const useFetchOrdersOptimized = () => {
  const [orders, setOrders] = useState<OptimizedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 50; // Smaller page size for faster loading

  const fetchOrders = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .rpc('get_orders_with_customer_info', {
          p_limit: pageSize,
          p_offset: currentPage * pageSize
        });

      if (error) throw error;

      if (data) {
        // Transform data to match UI expectations
        const transformedOrders: OptimizedOrder[] = data.map(order => ({
          ...order,
          order_status: 'new' as const,
          order_items: [],
          updated_at: order.created_at,
          special_instructions: null,
          customer_name_from_profile: order.customer_name,
          customer_email_from_profile: order.customer_email
        }));

        if (reset) {
          setOrders(transformedOrders);
          setPage(1);
        } else {
          setOrders(prev => [...prev, ...transformedOrders]);
          setPage(prev => prev + 1);
        }

        setHasMore(data.length === pageSize);
        console.log(`[Optimized] Fetched ${data.length} orders (page ${currentPage + 1})`);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  const resetAndFetch = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchOrders(false);
    }
  }, [fetchOrders, isLoading, hasMore]);

  useEffect(() => {
    resetAndFetch();
  }, []);

  // Set up real-time subscription with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const channel = supabase
      .channel('orders-optimized')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          console.log('Real-time order update detected');
          // Debounce refetch to avoid too many calls
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            resetAndFetch();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [resetAndFetch]);

  return { 
    orders, 
    setOrders, 
    isLoading, 
    fetchOrders: resetAndFetch,
    loadMore,
    hasMore
  };
};
