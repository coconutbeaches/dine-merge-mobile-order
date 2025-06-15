
import { useState, useEffect } from 'react';
import { Order, OrderStatus, SupabaseOrderStatus, mapSupabaseToOrderStatus } from '@/types/supabaseTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUserOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load user orders with profile information
  const loadUserOrders = async (userId: string) => {
    setIsLoading(true);
    try {
      // First fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Then fetch profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.warn('Could not fetch profile data:', profileError);
      }

      console.log("Orders data fetched (DB):", ordersData);

      if (ordersData) {
        const transformedOrders = ordersData.map(order => {
          let appOrderStatus: OrderStatus;
          
          if (order.order_status) {
            appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          } else {
            console.warn(`Order ${order.id} - order_status from DB is null or empty. Defaulting to 'new'. DB value: `, order.order_status);
            appOrderStatus = 'new';
          }

          console.log(`[UserOrders] Order ${order.id}: Supabase raw status='${order.order_status}', mapped app status='${appOrderStatus}'`);

          return {
            ...order,
            order_status: appOrderStatus,
            customer_name_from_profile: profileData?.name || null,
            customer_email_from_profile: profileData?.email || null
          } as Order;
        });
        
        console.log("Transformed orders for user:", transformedOrders);
        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error("Error loading user orders:", error);
      toast.error("Failed to load your orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch orders when userId changes and set up real-time subscription
  useEffect(() => {
    if (userId) {
      loadUserOrders(userId);
      
      const channel = supabase
        .channel(`orders-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
          async (payload) => {
            console.log("Real-time order update in orders hook:", payload);

            const enrichAndTransformOrder = async (order: any): Promise<Order> => {
              let profileData = null;
              if (order.user_id) {
                const { data: pData, error: profileError } = await supabase
                  .from('profiles')
                  .select('name, email')
                  .eq('id', order.user_id)
                  .maybeSingle();
                  
                if (profileError) {
                  console.warn('Could not fetch profile data for realtime update:', profileError);
                } else {
                  profileData = pData;
                }
              }
              
              const appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
              
              return {
                ...order,
                order_status: appOrderStatus,
                customer_name_from_profile: profileData?.name || order.customer_name_from_profile || null,
                customer_email_from_profile: profileData?.email || order.customer_email_from_profile || null
              } as Order;
            };

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const transformedOrder = await enrichAndTransformOrder(payload.new);
              setOrders(prevOrders => {
                const index = prevOrders.findIndex(o => o.id === transformedOrder.id);
                if (index !== -1) {
                  const newOrders = [...prevOrders];
                  newOrders[index] = transformedOrder;
                  return newOrders;
                } else {
                  return [transformedOrder, ...prevOrders];
                }
              });
            } else if (payload.eventType === 'DELETE') {
              if (payload.old.id) {
                setOrders(prevOrders => prevOrders.filter(o => o.id !== payload.old.id));
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setOrders([]);
    }
  }, [userId]);
  
  return { orders, setOrders, isLoading, loadUserOrders };
}
