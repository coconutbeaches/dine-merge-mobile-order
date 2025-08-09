import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExtendedOrder } from '@/src/types/app';
import { getOrdersChannel } from '@/services/ordersChannelSingleton';

interface FilterOptions {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface OptimizedOrder {
  id: number;
  user_id: string | null;
  guest_user_id: string | null;
  guest_first_name: string | null;
  stay_id: string | null;
  table_number: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
  order_status: string;
  order_items: any[];
  special_instructions: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_type: string;
  formatted_stay_id: string;
  customer_name_from_profile: string | null;
  customer_email_from_profile: string | null;
}

export const useFetchOrdersOptimized = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 100; // Increase page size for better performance
  const filtersRef = useRef<FilterOptions>({});

  const fetchOrders = useCallback(async (reset = false, customFilters?: FilterOptions) => {
    const currentPage = reset ? 0 : page;
    const isInitialLoad = reset || currentPage === 0;
    const filters = customFilters || filtersRef.current;

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const { data, error } = await supabase
        .rpc('rpc_admin_get_orders', {
          p_limit: pageSize,
          p_offset: currentPage * pageSize,
          p_search: filters.search || null,
          p_status: filters.status || null,
          p_start: filters.startDate ? new Date(filters.startDate).toISOString() : null,
          p_end: filters.endDate ? new Date(filters.endDate).toISOString() : null
        });

      if (error) throw error;

      if (data) {
        // Transform data to match UI expectations
        const transformedOrders: ExtendedOrder[] = data.map(order => ({
          ...order,
          formattedStayId: order.formatted_stay_id
        }));

        if (isInitialLoad) {
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
      if (isInitialLoad) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [page, pageSize]);

  const resetAndFetch = useCallback(() => {
    setPage(0);
    setHasMore(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchOrders(false);
    }
  }, [fetchOrders, isLoadingMore, hasMore]);

  useEffect(() => {
    resetAndFetch();
  }, []);

  // Set up lightweight real-time subscription using singleton channel
  useEffect(() => {
    const { subscribe } = getOrdersChannel();

    const unsubscribe = subscribe(() => {
      console.log('[OrdersOptimized] Real-time order update detected');
      // Debounced refetch to avoid excessive calls
      setTimeout(() => {
        resetAndFetch();
      }, 1000);
    });

    return () => {
      unsubscribe();
    };
  }, [resetAndFetch]);

  const setFilters = useCallback(
    (newFilters: FilterOptions) => {
      filtersRef.current = newFilters;
      resetAndFetch();
    },
    [resetAndFetch]
  );

  return {
    orders,
    setOrders,
    isLoading,
    isLoadingMore,
    fetchOrders: resetAndFetch,
    loadMore,
    hasMore,
    setFilters
  };
};
