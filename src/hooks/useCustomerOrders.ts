import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Order, 
  OrderStatus, 
  Profile, 
  SupabaseOrderStatus
} from '@/types/app';
import { mapSupabaseToOrderStatus } from '@/utils/orderDashboardUtils';
import { formatStayId } from '@/lib/utils';

// Helper function to transform a single Supabase order
const transformSupabaseOrder = (order: any, profileData: Profile | null): Order => {
  let appOrderStatus: OrderStatus;
  if (order.order_status) {
    appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
  } else {
    appOrderStatus = 'new';
  }
  return {
    ...order,
    order_status: appOrderStatus,
    customer_name_from_profile: profileData?.name || null,
    customer_email_from_profile: profileData?.email || null
  } as Order;
};

export const useCustomerOrders = (customerId: string | undefined) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [customerType, setCustomerType] = useState<'auth_user' | 'guest_family' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      // Determine if this is a UUID (auth user) or stay_id (guest family)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      const detectedCustomerType = isUUID ? 'auth_user' : 'guest_family';
      setCustomerType(detectedCustomerType);
      
      Promise.all([
        fetchCustomerDetails(customerId, detectedCustomerType),
        fetchCustomerOrders(customerId, detectedCustomerType)
      ]).finally(() => setIsLoading(false));
      
      // Setup real-time subscription for this customer's orders
      // For guest families, we need to listen for stay_id changes
      const filter = detectedCustomerType === 'auth_user' 
        ? `user_id=eq.${customerId}` 
        : `stay_id=eq.${customerId}`;
        
      const channel = supabase
        .channel(`customer-orders-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter },
          (payload) => {
            setOrders(prevOrders => {
              const newOrder = payload.new as Order;
              const oldOrder = payload.old as Order;

              switch (payload.eventType) {
                case 'INSERT':
                  return [transformSupabaseOrder(newOrder, customer), ...prevOrders];
                case 'UPDATE':
                  return prevOrders.map(order =>
                    order.id === newOrder.id ? transformSupabaseOrder(newOrder, customer) : order
                  );
                case 'DELETE':
                  return prevOrders.filter(order => order.id !== oldOrder.id);
                default:
                  return prevOrders;
              }
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [customerId]);

  const fetchCustomerDetails = async (customerId: string, customerType: 'auth_user' | 'guest_family') => {
    try {
      if (customerType === 'auth_user') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', customerId)
          .single();
          
        if (error) throw error;
        setCustomer(data);
      } else {
        // For guest families, create a virtual customer profile
        setCustomer({
          id: customerId,
          name: formatStayId(customerId), // Use formatStayId for consistent display (e.g., "walkin 12" or "A5 CROWLEY")
          email: '',
          phone: null,
          role: null,
          customer_type: 'guest_family',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          avatar_url: null,
          avatar_path: null,
          archived: false
        });
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const fetchCustomerOrders = async (customerId: string, customerType: 'auth_user' | 'guest_family') => {
    try {
      let ordersData;
      let ordersError;
      
      if (customerType === 'auth_user') {
        // Fetch orders for authenticated user
        const result = await supabase
          .from('orders')
          .select('*, table_number')
          .eq('user_id', customerId)
          .order('created_at', { ascending: false });
        ordersData = result.data;
        ordersError = result.error;
      } else {
        // Fetch orders for guest family (all orders with same stay_id)
        const result = await supabase
          .from('orders')
          .select('*, table_number')
          .eq('stay_id', customerId)
          .order('created_at', { ascending: false });
        ordersData = result.data;
        ordersError = result.error;
      }
        
      if (ordersError) throw ordersError;
      
      let profileData = null;
      if (customerType === 'auth_user') {
        // Fetch profile data for auth users
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', customerId)
          .single();
          
        if (profileError) {
          console.warn('Could not fetch profile data:', profileError);
        } else {
          profileData = data;
        }
      }
      
      if (ordersData) {
        // Transform the data to correctly handle the order_status and add customer info
        const transformedOrders = ordersData.map(order => transformSupabaseOrder(order, profileData));
        
        setOrders(transformedOrders);
        console.log(`Fetched ${transformedOrders.length} orders for ${customerType} customer: ${customerId}`);
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
    setOrders,
    customer,
    customerType,
    isLoading
  };
};
