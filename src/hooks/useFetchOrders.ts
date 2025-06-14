
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { toast } from 'sonner';

const transformOrder = (order: any, profilesData: any[] | null): Order => {
  const profile = profilesData?.find(p => p.id === order.user_id);

  let normalizedOrderStatus: OrderStatus = 'new';
  if (order.order_status === 'out_for_delivery') {
    normalizedOrderStatus = 'delivery';
  } else if (
    order.order_status &&
    [
      'new',
      'preparing',
      'ready',
      'delivery',
      'completed',
      'paid',
      'cancelled'
    ].includes(order.order_status)
  ) {
    normalizedOrderStatus = order.order_status as OrderStatus;
  }

  return {
    ...order,
    order_status: normalizedOrderStatus,
    customer_name_from_profile: profile?.name || null,
    customer_email_from_profile: profile?.email || null
  } as Order;
};

export const useFetchOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

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
                .in('id', userIds);
            if (profilesError) {
                console.warn('Could not fetch profiles data:', profilesError);
            }
            profilesData = data;
        }

        const transformedOrders = ordersData.map(order => transformOrder(order, profilesData));
        setOrders(transformedOrders);
        console.log("[Dashboard] Orders fetched from DB:", ordersData.map(o => ({ id: o.id, status: o.order_status })));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    
    const channel = supabase
      .channel('orders-dashboard-refactored')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log("Real-time order update:", payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  return { orders, setOrders, isLoading, fetchOrders };
};
