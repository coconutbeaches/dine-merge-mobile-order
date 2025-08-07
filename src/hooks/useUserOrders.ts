import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, SupabaseOrderStatus } from '@/types/app';
import { mapSupabaseToOrderStatus } from '@/utils/orderDashboardUtils';
import { toast } from 'sonner';
import { getUserOrdersChannel } from '@/services/userChannelsSingleton'; // Import the new singleton

export const useUserOrders = (userId: string | undefined) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Load user orders with profile information
  const loadUserOrders = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.warn('Could not fetch profile data:', profileError);
      }

      if (ordersData) {
        const transformedOrders = ordersData.map(order => {
          const appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          return {
            ...order,
            order_status: appOrderStatus,
            customer_name_from_profile: profileData?.name || null,
            customer_email_from_profile: profileData?.email || null
          } as Order;
        });
        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error("Error loading user orders:", error);
      toast.error("Failed to load your orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      loadUserOrders(userId);
    } else {
      setOrders([]);
    }
  }, [userId, loadUserOrders]);

  // Set up real-time subscription using the new singleton
  useEffect(() => {
    if (!userId) return;

    const handleRealtimeUpdate = (payload: any) => {
      console.log('[UserOrders] Real-time update received:', payload);
      const updatedOrder = payload.new;
      const eventType = payload.eventType;

      setOrders(prevOrders => {
        if (eventType === 'DELETE') {
          return prevOrders.filter(o => o.id !== payload.old.id);
        }
        
        const existingIndex = prevOrders.findIndex(o => o.id === updatedOrder.id);
        
        if (existingIndex !== -1) {
          // Update existing order
          const newOrders = [...prevOrders];
          const appOrderStatus = mapSupabaseToOrderStatus(updatedOrder.order_status as SupabaseOrderStatus);
          newOrders[existingIndex] = { ...newOrders[existingIndex], ...updatedOrder, order_status: appOrderStatus };
          return newOrders;
        } else {
          // Add new order
          const appOrderStatus = mapSupabaseToOrderStatus(updatedOrder.order_status as SupabaseOrderStatus);
          return [{ ...updatedOrder, order_status: appOrderStatus } as Order, ...prevOrders];
        }
      });
    };

    const channel = getUserOrdersChannel(userId);
    const unsubscribe = channel.subscribe(handleRealtimeUpdate);

    return () => {
      unsubscribe();
    };
  }, [userId]);
  
  return { orders, setOrders, isLoading, loadUserOrders };
}
