
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order as BaseOrder } from '@/types/supabaseTypes';
import { OrderStatus, ExtendedOrder } from '@/src/types/app';
import { toast } from 'sonner';
import { formatStayId } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { unsubscribeChannel } from '@/utils/supabaseChannelCleanup';

const transformOrder = (order: any, profilesData: any[] | null): ExtendedOrder => {
  const profile = profilesData?.find(p => p.id === order.user_id);

  // Debug log for guest orders
  if (order.guest_user_id) {
    console.log('Transforming guest order:', {
      id: order.id,
      guest_user_id: order.guest_user_id,
      guest_first_name: order.guest_first_name,
      stay_id: order.stay_id,
      user_id: order.user_id,
      profile: profile
    });
  }

  const formattedStayId = formatStayId(order.stay_id, order.table_number);

  // Use actual data from database with smart fallbacks
  return {
    ...order,
    // Prioritize customer name from order record, then profile, then guest name
    customer_name: order.customer_name || profile?.name || order.guest_first_name || null,
    customer_email: profile?.email || null,
    order_status: order.order_status || 'new' as OrderStatus, // Use actual status from database
    order_items: order.order_items || [], // Use actual order items or default empty array
    updated_at: order.updated_at || order.created_at, // Use updated_at if available, fallback to created_at
    customer_type: profile?.customer_type || 'hotel_guest', // Default type
    special_instructions: order.special_instructions || null, // Use actual special instructions
    // Add profile data for UI display
    customer_name_from_profile: profile?.name || null,
    customer_email_from_profile: profile?.email || null,
    formattedStayId
  } as ExtendedOrder;
};

export const useFetchOrders = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 100; // Increase page size for better performance
  const queryClient = useQueryClient();

  const fetchOrders = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    const isInitialLoad = reset || currentPage === 0;
    
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
        // Optimized query - select all necessary columns for complete functionality
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            user_id,
            guest_user_id,
            guest_first_name,
            stay_id,
            total_amount,
            table_number,
            created_at,
            updated_at,
            order_status,
            order_items,
            special_instructions,
            customer_name
          `)
          .order('created_at', { ascending: false })
          .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (ordersError) throw ordersError;

      if (ordersData) {
        const userIds = [
          ...new Set(ordersData.map(order => order.user_id).filter(Boolean))
        ];
        
        let profilesData: any[] | null = null;
        if (userIds.length > 0) {
            const { data, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, email')
                .eq('archived', false)
                .eq('deleted', false)
                .in('id', userIds);
            if (profilesError) {
                console.warn('Could not fetch profiles data:', profilesError);
            }
            profilesData = data;
        }

        const transformedOrders = ordersData.map(order => transformOrder(order, profilesData));
        
        if (isInitialLoad) {
          setOrders(transformedOrders);
          setPage(1);
        } else {
          setOrders(prev => [...prev, ...transformedOrders]);
          setPage(prev => prev + 1);
        }
        
        setHasMore(ordersData.length === pageSize);
        console.log(`[Dashboard] Fetched ${ordersData.length} orders (page ${currentPage + 1})`);
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
    
  // Row-level real-time subscription with broadcast throttling
  useEffect(() => {
    let broadcastTimeout: NodeJS.Timeout;
    let pendingUpdates = new Map<string, ExtendedOrder>();
    
    const processPendingUpdates = () => {
      if (pendingUpdates.size === 0) return;
      
      const updates = Array.from(pendingUpdates.values());
      pendingUpdates.clear();
      
      // Update React Query cache
      queryClient.setQueryData(['orders', 'dashboard'], (oldData: ExtendedOrder[] | undefined) => {
        if (!oldData) return oldData;
        
        let newData = [...oldData];
        updates.forEach(update => {
          const existingIndex = newData.findIndex(order => order.id === update.id);
          if (existingIndex !== -1) {
            newData[existingIndex] = update;
          } else {
            newData = [update, ...newData];
          }
        });
        return newData;
      });
      
      // Update local state
      setOrders(prev => {
        let newOrders = [...prev];
        updates.forEach(update => {
          const existingIndex = newOrders.findIndex(order => order.id === update.id);
          if (existingIndex !== -1) {
            newOrders[existingIndex] = update;
          } else {
            newOrders = [update, ...newOrders];
          }
        });
        return newOrders;
      });
      
      console.log(`[Dashboard] Processed ${updates.length} broadcast updates`);
    };
    
    const channel = supabase
      .channel('orders-dashboard-row-level')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        async (payload) => {
          console.log('Real-time order INSERT:', payload);
          
          // Fetch profile data if needed
          let profileData = null;
          if (payload.new.user_id) {
            const { data } = await supabase
              .from('profiles')
              .select('id, name, email')
              .eq('id', payload.new.user_id)
              .single();
            profileData = data;
          }
          
          const newOrder = transformOrder(payload.new, profileData ? [profileData] : null);
          pendingUpdates.set(payload.new.id, newOrder);
          
          clearTimeout(broadcastTimeout);
          broadcastTimeout = setTimeout(processPendingUpdates, 300);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          // Ignore updates where order_status hasn't changed
          if (payload.new.order_status === payload.old.order_status) {
            return;
          }
          
          console.log('Real-time order UPDATE (status changed):', payload);
          
          const existingOrder = orders.find(order => order.id === payload.new.id);
          
          // Fetch profile data if needed
          let profileData = null;
          if (payload.new.user_id) {
            const { data } = await supabase
              .from('profiles')
              .select('id, name, email')
              .eq('id', payload.new.user_id)
              .single();
            profileData = data;
          }
          
          const updatedOrder = transformOrder({
            ...(existingOrder || {}),
            ...payload.new
          }, profileData ? [profileData] : null);
          
          pendingUpdates.set(payload.new.id, updatedOrder);
          
          clearTimeout(broadcastTimeout);
          broadcastTimeout = setTimeout(processPendingUpdates, 300);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Real-time order DELETE:', payload);
          
          // For deletes, update immediately
          setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          
          // Update React Query cache
          queryClient.setQueryData(['orders', 'dashboard'], (oldData: ExtendedOrder[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.filter(order => order.id !== payload.old.id);
          });
        }
      )
      .subscribe();

    return () => {
      clearTimeout(broadcastTimeout);
      unsubscribeChannel('orders-dashboard-row-level');
    };
  }, [orders, queryClient]);

  return { 
    orders, 
    setOrders, 
    isLoading, 
    isLoadingMore,
    hasMore,
    fetchOrders: resetAndFetch,
    loadMore
  };
};
