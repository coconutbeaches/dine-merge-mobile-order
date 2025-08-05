import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, SupabaseOrderStatus } from '@/types/app';
import { mapSupabaseToOrderStatus } from '@/utils/orderDashboardUtils';
import { toast } from 'sonner';
import { unsubscribeChannel } from '@/utils/supabaseChannelCleanup';

export const useUserOrders = (userId: string | undefined) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

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
      
      let broadcastTimeout: NodeJS.Timeout;
      let pendingUpdates = new Map<string, Order>();
      
      const processPendingUpdates = () => {
        if (pendingUpdates.size === 0) return;
        
        const updates = Array.from(pendingUpdates.values());
        pendingUpdates.clear();
        
        // Update React Query cache
        queryClient.setQueryData(['userOrders', userId], (oldData: Order[] | undefined) => {
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
        setOrders(prevOrders => {
          let newOrders = [...prevOrders];
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
        
        console.log(`[UserOrders] Processed ${updates.length} broadcast updates`);
      };
      
      const channel = supabase
        .channel(`orders-${userId}-row-level`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
          async (payload) => {
            console.log("Real-time order INSERT:", payload);
            
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
            
            const transformedOrder = await enrichAndTransformOrder(payload.new);
            pendingUpdates.set(payload.new.id, transformedOrder);
            
            clearTimeout(broadcastTimeout);
            broadcastTimeout = setTimeout(processPendingUpdates, 300);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
          async (payload) => {
            // Ignore updates where order_status hasn't changed
            if (payload.new.order_status === payload.old.order_status) {
              return;
            }
            
            console.log("Real-time order UPDATE (status changed):", payload);
            
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
            
            const transformedOrder = await enrichAndTransformOrder(payload.new);
            pendingUpdates.set(payload.new.id, transformedOrder);
            
            clearTimeout(broadcastTimeout);
            broadcastTimeout = setTimeout(processPendingUpdates, 300);
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
          (payload) => {
            console.log("Real-time order DELETE:", payload);
            
            // For deletes, update immediately
            setOrders(prevOrders => prevOrders.filter(o => o.id !== payload.old.id));
            
            // Update React Query cache
            queryClient.setQueryData(['userOrders', userId], (oldData: Order[] | undefined) => {
              if (!oldData) return oldData;
              return oldData.filter(order => order.id !== payload.old.id);
            });
          }
        )
        .subscribe();

      return () => {
        clearTimeout(broadcastTimeout);
        unsubscribeChannel(`orders-${userId}-row-level`);
      };
    } else {
      setOrders([]);
    }
  }, [userId]);
  
  return { orders, setOrders, isLoading, loadUserOrders };
}
