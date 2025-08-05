
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtendedOrder } from '@/src/types/app';
import { useOrderActions } from './useOrderActions';
import { useOrderSelection } from './useOrderSelection';

export const useOrdersDashboard = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 100;

  const fetchOrders = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    const isInitialLoad = reset || currentPage === 0;
    
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
          p_search: null,
          p_status: null,
          p_start: null,
          p_end: null
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
        console.log(`[OrdersDashboard] Fetched ${data.length} orders (page ${currentPage + 1})`);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
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
  const { 
    selectedOrders, 
    setSelectedOrders, 
    toggleSelectOrder, 
    selectAllOrders, 
    clearSelection 
  } = useOrderSelection(orders);
  
  const { 
    updateOrderStatus, 
    updateMultipleOrderStatuses, 
    deleteSelectedOrders: deleteOrdersAction 
  } = useOrderActions(setOrders);

  const deleteSelectedOrders = () => {
    deleteOrdersAction(selectedOrders, setSelectedOrders);
  };
  
  return {
    orders,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchOrders: resetAndFetch,
    loadMore,
    selectedOrders,
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    selectAllOrders,
    clearSelection,
    updateMultipleOrderStatuses,
  };
};
