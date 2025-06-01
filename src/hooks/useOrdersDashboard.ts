
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Order, 
  OrderStatus,
  SupabaseOrderStatus,
  mapOrderStatusToSupabase,
  mapSupabaseToOrderStatus
} from '@/types/supabaseTypes';

export function useOrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    // Setup real-time subscription for orders
    const channel = supabase
      .channel('custom-orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(order => order.user_id).filter(id => id != null))] as string[];
        let profilesMap = new Map<string, { name?: string; email?: string }>();

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            // Continue without profile data if there's an error
          } else if (profilesData) {
            profilesData.forEach(profile => {
              profilesMap.set(profile.id, { name: profile.name, email: profile.email });
            });
          }
        }

        const enrichedOrders = data.map(order => {
          let appOrderStatus: OrderStatus;
          if (order.order_status) {
            appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          } else {
            appOrderStatus = 'new';
          }

          let customerNameFromProfile: string | undefined = undefined;
          let customerEmailFromProfile: string | undefined = undefined;

          if (order.user_id) {
            const profile = profilesMap.get(order.user_id);
            if (profile) {
              customerNameFromProfile = profile.name || 'Unnamed Profile';
              customerEmailFromProfile = profile.email || 'No Email';
            } else {
              customerNameFromProfile = 'Unknown Customer (Profile Not Found)';
              customerEmailFromProfile = 'N/A';
            }
          } else if (order.customer_name) {
            // Fallback to existing customer_name if user_id is null but customer_name exists
            customerNameFromProfile = order.customer_name; 
            customerEmailFromProfile = 'N/A (Guest Order)';
          } else {
            customerNameFromProfile = 'Guest Order';
            customerEmailFromProfile = 'N/A';
          }
          
          return {
            ...order,
            order_status: appOrderStatus,
            customer_name_from_profile: customerNameFromProfile,
            customer_email_from_profile: customerEmailFromProfile,
          } as Order;
        });
        
        setOrders(enrichedOrders);
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      toast.error(`Failed to fetch orders: ${error.message}`);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      console.log(`Updating order ${orderId} to status: ${newStatus}`);
      
      // Map our application status to Supabase status
      const supabaseStatus = mapOrderStatusToSupabase(newStatus);
      
      const updateData: any = { 
        order_status: supabaseStatus, 
        updated_at: new Date().toISOString() 
      };
      
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      // Update the local state to reflect the change immediately
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, order_status: newStatus } 
            : order
        ) as Order[]
      );
      
      toast.success("Order status updated successfully");
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(`Failed to update order status: ${error.message}`);
    }
  };

  const deleteSelectedOrders = async () => {
    if (selectedOrders.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', selectedOrders);

      if (error) throw error;
      
      toast.success(`${selectedOrders.length} order(s) deleted successfully`);
      
      setOrders(orders.filter(order => !selectedOrders.includes(order.id)));
      setSelectedOrders([]);
    } catch (error: any) {
      toast.error(`Failed to delete orders: ${error.message}`);
    }
  };

  const toggleSelectOrder = (orderId: number) => {
    setSelectedOrders(prevSelected => 
      prevSelected.includes(orderId) 
        ? prevSelected.filter(id => id !== orderId) 
        : [...prevSelected, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === orders.length && orders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  return {
    orders,
    selectedOrders,
    isLoading,
    fetchOrders,
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    selectAllOrders
  };
}
