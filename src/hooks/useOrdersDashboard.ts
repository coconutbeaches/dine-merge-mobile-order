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
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (ordersData) {
        const userIds = [...new Set(ordersData.map(order => order.user_id).filter(Boolean))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', userIds);
          
        if (profilesError) {
          console.warn('Could not fetch profiles data:', profilesError);
        }

        const transformedOrders = ordersData.map(order => {
          const profile = profilesData?.find(p => p.id === order.user_id);

          // Parse order_status and force to our local updated OrderStatus type
          return {
            ...order,
            order_status: order.order_status ? mapSupabaseToOrderStatus(order.order_status as OrderStatus) : 'new',
            customer_name_from_profile: profile?.name || null,
            customer_email_from_profile: profile?.email || null
          };
        }) as Order[];
        
        setOrders(transformedOrders);
        console.log("[Dashboard] Orders fetched from DB:", ordersData.map(o => ({id: o.id, status: o.order_status})));
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
      const supabaseStatus = mapOrderStatusToSupabase(newStatus);
      console.log(`Updating order ${orderId} status to ${newStatus} (Supabase: ${supabaseStatus})`);

      // order_status field now matches the updated OrderStatus union
      const { error, count } = await supabase
        .from('orders')
        .update({ 
          order_status: supabaseStatus,
          updated_at: new Date().toISOString()
        }, { count: "exact" })
        .eq('id', orderId);

      if (error) {
        console.error('[Dashboard] Supabase error updating order status:', error);
        toast.error('Supabase error: ' + error.message);
        return;
      }
      if (count === 0) {
        console.error(`[Dashboard] No rows were updated for order ${orderId} (status=${supabaseStatus}).`);
        toast.error('Order not found or status not changed in DB');
        return;
      }

      const { data: updatedOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (fetchError) {
        console.warn('[Dashboard] Could not fetch updated order for verification:', fetchError);
      } else {
        console.log('[Dashboard] Order after status update (from DB):', {
          id: updatedOrder.id,
          order_status: updatedOrder.order_status,
        });
      }

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

  const updateMultipleOrderStatuses = async (orderIds: number[], newStatus: OrderStatus) => {
    if (orderIds.length === 0) return;
    try {
      const supabaseStatus = mapOrderStatusToSupabase(newStatus);

      const { error, count } = await supabase
        .from('orders')
        .update({ 
          order_status: supabaseStatus,
          updated_at: new Date().toISOString(),
        }, { count: "exact" })
        .in('id', orderIds);

      if (error) {
        toast.error('Bulk update failed: ' + error.message);
        return;
      }
      if (!count || count === 0) {
        toast.error('No orders updated');
        return;
      }

      setOrders(prev =>
        prev.map(order =>
          orderIds.includes(order.id)
            ? { ...order, order_status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );
      toast.success(`Bulk status set to ${newStatus} for ${orderIds.length} orders`);
    } catch (e: any) {
      toast.error("Bulk update failed: " + e.message);
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
    fetchOrders,
    updateMultipleOrderStatuses
  };
};
