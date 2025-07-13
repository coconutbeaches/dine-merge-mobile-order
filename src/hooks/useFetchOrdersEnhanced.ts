import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExtendedOrder } from '@/src/types/app';
import { formatStayId } from '@/lib/utils';

interface CursorInfo {
  created_at: string;
  id: string;
}

interface FilterOptions {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const useFetchOrdersEnhanced = (filters: FilterOptions = {}) => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<CursorInfo | null>(null);
  const pageSize = 100;

  // Track filters to determine when to reset pagination
  const filtersRef = useRef<FilterOptions>(filters);
  
  const fetchOrders = useCallback(async (reset = false, customFilters?: FilterOptions) => {
    const currentFilters = customFilters || filters;
    const isInitialLoad = reset || !cursor;
    
    if (isInitialLoad) {
      setIsLoading(true);
      setCursor(null);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const { data, error } = await supabase
        .rpc('rpc_admin_get_orders', {
          p_limit: pageSize,
          p_offset: isInitialLoad ? 0 : orders.length,
          p_search: currentFilters.search || null,
          p_status: currentFilters.status || null,
          p_start: currentFilters.startDate ? new Date(currentFilters.startDate).toISOString() : null,
          p_end: currentFilters.endDate ? new Date(currentFilters.endDate).toISOString() : null
        });

      if (error) throw error;

      if (data) {
        // Transform data to match UI expectations
        const transformedOrders: ExtendedOrder[] = data.map(order => ({
          ...order,
          formattedStayId: order.formatted_stay_id || formatStayId(order.stay_id, order.table_number)
        }));

        if (isInitialLoad) {
          setOrders(transformedOrders);
        } else {
          setOrders(prev => [...prev, ...transformedOrders]);
        }

        // Update cursor for next page
        if (transformedOrders.length > 0) {
          const lastOrder = transformedOrders[transformedOrders.length - 1];
          setCursor({
            created_at: lastOrder.created_at,
            id: String(lastOrder.id)
          });
        }

        setHasMore(data.length === pageSize);
        console.log(`[Enhanced] Fetched ${data.length} orders (cursor: ${cursor?.id || 'initial'})`);
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
  }, [filters, cursor, orders.length, pageSize]);

  const resetAndFetch = useCallback((newFilters?: FilterOptions) => {
    setCursor(null);
    setHasMore(true);
    fetchOrders(true, newFilters);
  }, [fetchOrders]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && cursor) {
      fetchOrders(false);
    }
  }, [fetchOrders, isLoadingMore, hasMore, cursor]);

  // Reset pagination when filters change
  useEffect(() => {
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(filtersRef.current);
    if (filtersChanged) {
      filtersRef.current = filters;
      resetAndFetch();
    }
  }, [filters, resetAndFetch]);

  // Initial fetch
  useEffect(() => {
    resetAndFetch();
  }, []);

  // Enhanced real-time subscription with selective columns and patching
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const channel = supabase
      .channel('orders-enhanced-selective')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'orders' 
        },
        (payload) => {
          console.log('Real-time order INSERT:', payload);
          
          // For inserts, add the new order to the beginning of the list
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setOrders(prev => {
              // Check if order already exists to avoid duplicates
              const existingIndex = prev.findIndex(order => order.id === payload.new.id);
              if (existingIndex !== -1) {
                return prev;
              }
              
              // Transform the new order
              const newOrder: ExtendedOrder = {
                ...payload.new,
                formattedStayId: formatStayId(payload.new.stay_id, payload.new.table_number),
                customer_name: payload.new.customer_name || payload.new.guest_first_name,
                customer_email: null,
                customer_type: payload.new.guest_user_id ? 'guest' : 'registered',
                customer_name_from_profile: null,
                customer_email_from_profile: null
              };
              
              return [newOrder, ...prev];
            });
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders' 
        },
        (payload) => {
          console.log('Real-time order UPDATE:', payload);
          
          // For updates, patch the existing order
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setOrders(prev => {
              const orderIndex = prev.findIndex(order => order.id === payload.new.id);
              if (orderIndex === -1) {
                return prev;
              }
              
              const updatedOrders = [...prev];
              updatedOrders[orderIndex] = {
                ...updatedOrders[orderIndex],
                ...payload.new,
                formattedStayId: formatStayId(payload.new.stay_id, payload.new.table_number),
                customer_name: payload.new.customer_name || payload.new.guest_first_name || updatedOrders[orderIndex].customer_name,
                customer_email: updatedOrders[orderIndex].customer_email,
                customer_type: payload.new.guest_user_id ? 'guest' : 'registered',
              };
              
              return updatedOrders;
            });
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'orders' 
        },
        (payload) => {
          console.log('Real-time order DELETE:', payload);
          
          // For deletes, remove the order from the list
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    orders, 
    setOrders, 
    isLoading, 
    isLoadingMore,
    fetchOrders: resetAndFetch,
    loadMore,
    hasMore,
    cursor
  };
};
