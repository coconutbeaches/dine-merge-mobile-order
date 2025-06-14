
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, SupabaseOrderStatus, mapOrderStatusToSupabase, mapSupabaseToOrderStatus } from '@/types/supabaseTypes';
import { toast } from 'sonner';

export const useOrdersDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  useEffect(() => {
    fetchOrders();
    
    // Real-time subscription for orders
    const channel = supabase
      .channel('orders-dashboard')
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
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // First fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (ordersData) {
        // Get unique user IDs to fetch profiles
        const userIds = [...new Set(ordersData.map(order => order.user_id).filter(Boolean))];
        
        // Fetch profiles for all users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
          
        if (profilesError) {
          console.warn('Could not fetch profiles data:', profilesError);
        }

        const transformedOrders = ordersData.map(order => {
          const profile = profilesData?.find(p => p.id === order.user_id);
          
          return {
            ...order,
            order_status: order.order_status ? mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus) : 'new' as OrderStatus,
            customer_name_from_profile: profile?.name || null,
            customer_email_from_profile: profile?.email || null
          };
        }) as Order[];
        
        setOrders(transformedOrders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      console.log(`Updating order ${orderId} status to ${newStatus}`);
      
      const supabaseStatus = mapOrderStatusToSupabase(newStatus);
      console.log(`Mapped status for DB: ${supabaseStatus}`);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          order_status: supabaseStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Supabase error updating order status:', error);
        throw error;
      }

      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, order_status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );

      toast.success(`Order #${orderId} status updated to ${newStatus}`);
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
      
      setOrders(prevOrders => 
        prevOrders.filter(order => !selectedOrders.includes(order.id))
      );
      setSelectedOrders([]);
      
      toast.success(`Deleted ${selectedOrders.length} orders`);
    } catch (error: any) {
      console.error('Error deleting orders:', error);
      toast.error(`Failed to delete orders: ${error.message}`);
    }
  };

  const toggleSelectOrder = (orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    setSelectedOrders(orders.map(order => order.id));
  };

  const clearSelection = () => {
    setSelectedOrders([]);
  };

  return {
    orders,
    isLoading,
    selectedOrders,
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    selectAllOrders,
    clearSelection,
    fetchOrders
  };
};
