
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
      
      if (data) {
        // Transform the data to ensure order_status is properly mapped to our application's OrderStatus
        const transformedOrders = data.map(order => {
          let appOrderStatus: OrderStatus;
          
          // Special handling for 'paid' orders
          if (order.payment_status === 'paid') {
            appOrderStatus = 'paid';
          } else if (order.order_status) {
            // Map from Supabase status to our application status
            appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          } else {
            // Default fallback
            appOrderStatus = 'new';
          }
          
          return {
            ...order,
            order_status: appOrderStatus
          } as Order;
        });
        
        setOrders(transformedOrders);
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
      const supabaseStatus = newStatus === 'paid' 
        ? 'completed' as SupabaseOrderStatus  // Special case for 'paid'
        : mapOrderStatusToSupabase(newStatus);
      
      // Also update payment_status to 'paid' if the new status is 'paid'
      const updateData: any = { 
        order_status: supabaseStatus, 
        updated_at: new Date().toISOString() 
      };
      
      // If setting to paid status, also update the payment_status
      if (newStatus === 'paid') {
        updateData.payment_status = 'paid';
      }
      
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
            ? { ...order, order_status: newStatus, payment_status: newStatus === 'paid' ? 'paid' : order.payment_status } 
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
