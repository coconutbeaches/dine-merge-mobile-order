
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { toast } from 'sonner';

export const useOrderActions = (
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
) => {
  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    try {
      let supabaseStatus: any = newStatus;
      if (supabaseStatus === "delivery") supabaseStatus = "out_for_delivery";

      console.log(`Updating order ${orderId} status to ${newStatus} (Supabase: ${supabaseStatus})`);

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
      let supabaseStatus: any = newStatus;
      if (supabaseStatus === "delivery") supabaseStatus = "out_for_delivery";

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

  const deleteSelectedOrders = async (
    selectedOrders: number[], 
    setSelectedOrders: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
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

  return {
    updateOrderStatus,
    updateMultipleOrderStatuses,
    deleteSelectedOrders,
  };
};
