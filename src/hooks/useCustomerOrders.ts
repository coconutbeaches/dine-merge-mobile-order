
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Order, 
  OrderStatus, 
  Profile, 
  SupabaseOrderStatus,
  mapSupabaseToOrderStatus 
} from '@/types/supabaseTypes';

export const useCustomerOrders = (customerId: string | undefined) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      Promise.all([
        fetchCustomerDetails(customerId),
        fetchCustomerOrders(customerId)
      ]).finally(() => setIsLoading(false));
      
      // Setup real-time subscription for this customer's orders
      const channel = supabase
        .channel(`customer-orders-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${customerId}` },
          (payload) => {
            console.log("Real-time order update:", payload);
            fetchCustomerOrders(customerId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [customerId]);

  const fetchCustomerDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      console.log("Customer details:", data);
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const fetchCustomerOrders = async (userId: string) => {
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
      
      console.log("Customer orders raw data:", ordersData);
      
      if (ordersData) {
        // Transform the data to correctly handle the order_status and add customer info
        const transformedOrders = ordersData.map(order => {
          let appOrderStatus: OrderStatus;
          
          if (order.order_status) {
            appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          } else {
            console.warn(`Order ${order.id} - order_status from DB is null or empty. Defaulting to 'new'. DB value: `, order.order_status);
            appOrderStatus = 'new';
          }
          
          console.log(`Order ${order.id} - DB order_status: ${order.order_status}, Calculated app_status: ${appOrderStatus}`);
          
          return {
            ...order,
            order_status: appOrderStatus,
            customer_name_from_profile: profileData?.name || null,
            customer_email_from_profile: profileData?.email || null
          } as Order;
        });
        
        console.log("Transformed orders:", transformedOrders);
        setOrders(transformedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setOrders([]);
    }
  };

  return {
    orders,
    customer,
    isLoading
  };
};
