import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExtendedOrder } from '@/src/types/app';

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
  order_items: unknown[];
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
  const pageSize = 100; // Increase page size for better performance
  const pageRef = useRef(0);
  const filtersRef = useRef<FilterOptions>({});
  const latestRequestIdRef = useRef(0);

  const transformOptimizedOrder = useCallback((order: OptimizedOrder): ExtendedOrder => {
    const customerName =
      order.customer_name ||
      order.customer_name_from_profile ||
      order.guest_first_name ||
      null;
    const customerEmail = order.customer_email || order.customer_email_from_profile || null;

    return {
      ...order,
      customer_name: customerName,
      customer_email: customerEmail,
      formattedStayId: order.formatted_stay_id,
    } as ExtendedOrder;
  }, []);

  const fetchOrdersFallback = useCallback(
    async (currentPage: number, filters: FilterOptions): Promise<ExtendedOrder[]> => {
      let query = supabase
        .from('orders')
        .select(`
          id,
          user_id,
          guest_user_id,
          guest_first_name,
          stay_id,
          table_number,
          total_amount,
          created_at,
          updated_at,
          order_status,
          order_items,
          special_instructions,
          customer_name
        `)
        .order('created_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (filters.status) {
        query = query.eq('order_status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('created_at', new Date(filters.startDate).toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', new Date(filters.endDate).toISOString());
      }
      if (filters.search?.trim()) {
        const escaped = filters.search.trim().replace(/[%]/g, '');
        query = query.or(
          `customer_name.ilike.%${escaped}%,guest_first_name.ilike.%${escaped}%,stay_id.ilike.%${escaped}%,table_number.ilike.%${escaped}%`,
        );
      }

      const { data: ordersData, error: ordersError } = await query;
      if (ordersError) {
        throw ordersError;
      }

      const userIds = [
        ...new Set((ordersData || []).map((order) => order.user_id).filter(Boolean)),
      ];

      let profilesById = new Map<string, { name: string | null; email: string | null }>();
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds as string[]);

        if (!profilesError && profilesData) {
          profilesById = new Map(
            profilesData.map((profile) => [
              profile.id,
              { name: profile.name ?? null, email: profile.email ?? null },
            ]),
          );
        }
      }

      return (ordersData || []).map((order) => {
        const profile = order.user_id ? profilesById.get(order.user_id) : undefined;
        const customerName = order.customer_name || profile?.name || order.guest_first_name || null;
        const customerEmail = profile?.email || null;
        return {
          ...order,
          customer_name: customerName,
          customer_email: customerEmail,
          formattedStayId: `${order.stay_id || ''}-${order.table_number || ''}`,
        } as ExtendedOrder;
      });
    },
    [pageSize],
  );

  const fetchOrders = useCallback(async (reset = false, customFilters?: FilterOptions) => {
    const currentPage = reset ? 0 : pageRef.current;
    const isInitialLoad = reset || currentPage === 0;
    const filters = customFilters || filtersRef.current;
    const requestId = ++latestRequestIdRef.current;

    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const rpcPromise = supabase
        .rpc('rpc_admin_get_orders', {
          p_limit: pageSize,
          p_offset: currentPage * pageSize,
          p_search: filters.search || null,
          p_status: filters.status || null,
          p_start: filters.startDate ? new Date(filters.startDate).toISOString() : null,
          p_end: filters.endDate ? new Date(filters.endDate).toISOString() : null,
        });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Orders request timeout')), 15000),
      );

      const { data, error } = (await Promise.race([rpcPromise, timeoutPromise])) as {
        data: OptimizedOrder[] | null;
        error: Error | null;
      };

      if (error) {
        throw error;
      }

      if (data) {
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        const transformedOrders: ExtendedOrder[] = data.map(transformOptimizedOrder);

        if (isInitialLoad) {
          setOrders(transformedOrders);
          pageRef.current = 1;
        } else {
          setOrders((prev) => [...prev, ...transformedOrders]);
          pageRef.current += 1;
        }

        setHasMore(data.length === pageSize);
        console.log(`[Optimized] Fetched ${data.length} orders (page ${currentPage + 1})`);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);

      try {
        const fallbackData = await fetchOrdersFallback(currentPage, filters);
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        if (isInitialLoad) {
          setOrders(fallbackData);
          pageRef.current = 1;
        } else {
          setOrders((prev) => [...prev, ...fallbackData]);
          pageRef.current += 1;
        }
        setHasMore(fallbackData.length === pageSize);
        toast.error('Using fallback order fetch due to slow query');
      } catch (fallbackError) {
        console.error('Fallback order fetch failed:', fallbackError);
        toast.error('Failed to fetch orders');
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        if (isInitialLoad) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    }
  }, [fetchOrdersFallback, pageSize, transformOptimizedOrder]);

  const resetAndFetch = useCallback(() => {
    pageRef.current = 0;
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
  }, [resetAndFetch]);

  const setFilters = useCallback(
    (newFilters: FilterOptions) => {
      filtersRef.current = newFilters;
      pageRef.current = 0;
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
