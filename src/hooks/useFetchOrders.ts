
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order as BaseOrder } from '@/types/supabaseTypes';
import { OrderStatus } from '@/src/types/app';
import { toast } from 'sonner';

// Extended Order type that includes fields the UI expects
interface ExtendedOrder extends BaseOrder {
  customer_name?: string | null;
  customer_email?: string | null;
  order_status?: OrderStatus;
  order_items?: any[];
  updated_at?: string | null;
  customer_type?: string | null;
  special_instructions?: string | null;
  customer_name_from_profile?: string | null;
  customer_email_from_profile?: string | null;
}

const transformOrder = (order: any, profilesData: any[] | null): ExtendedOrder => {
  const profile = profilesData?.find(p => p.id === order.user_id);

  // Since the database only has basic columns, we provide defaults for missing fields
  return {
    ...order,
    // Provide defaults for missing columns
    customer_name: profile?.name || null,
    customer_email: profile?.email || null,
    order_status: 'new' as OrderStatus, // Default status since column doesn't exist
    order_items: [], // Default empty array since column doesn't exist
    updated_at: order.created_at, // Use created_at as fallback
    customer_type: profile?.customer_type || 'hotel_guest', // Default type
    special_instructions: null, // Default null since column doesn't exist
    // Add profile data for UI display
    customer_name_from_profile: profile?.name || null,
    customer_email_from_profile: profile?.email || null
  } as ExtendedOrder;
};

export const useFetchOrders = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            user_id,
            total_amount,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(1000); // Limit to prevent large data transfers

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
