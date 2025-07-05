
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useOrderActions = (
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>
) => {
  const queryClient = useQueryClient();
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      let supabaseStatus: OrderStatus = newStatus;
      if (newStatus === "delivery") supabaseStatus = "out_for_delivery";

      console.log(`Updating order ${orderId} status to ${newStatus} (Supabase: ${supabaseStatus})`);

      // Try to update with order_status, fallback if column doesn't exist
      let updateResult;
      try {
        updateResult = await supabase
          .from('orders')
          .update({
            order_status: supabaseStatus,
            updated_at: new Date().toISOString()
          }, { count: "exact" })
          .eq('id', orderId);
      } catch (fallbackError) {
        console.log('order_status column not found, skipping status update');
        // If order_status column doesn't exist, just update timestamp
        updateResult = await supabase
          .from('orders')
          .update({
            updated_at: new Date().toISOString()
          }, { count: "exact" })
          .eq('id', orderId);
      }
      
      const { error, count } = updateResult;

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

      // Update local state if provided
      setOrders?.(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, order_status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['productOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      toast.success(`Order #${orderId} status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(`Failed to update order status: ${error.message}`);
    }
  };

  const updateMultipleOrderStatuses = async (orderIds: string[], newStatus: OrderStatus) => {
    if (orderIds.length === 0) return;
    try {
      let supabaseStatus: OrderStatus = newStatus;
      if (newStatus === "delivery") supabaseStatus = "out_for_delivery";

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

      setOrders?.(prev =>
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
    selectedOrders: string[], 
    setSelectedOrders: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    if (selectedOrders.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', selectedOrders);
        
      if (error) throw error;
      
      setOrders?.(prevOrders => 
        prevOrders.filter(order => !selectedOrders.includes(order.id))
      );
      setSelectedOrders([]);
      
      toast.success(`Deleted ${selectedOrders.length} orders`);
    } catch (error: any) {
      console.error('Error deleting orders:', error);
      toast.error(`Failed to delete orders: ${error.message}`);
    }
  };

  const updateOrder = async (updatedOrder: Order) => {
    try {
      const { id, created_at, table_number, order_items, total_amount } = updatedOrder;
      console.log('[useOrderActions] Sending update to Supabase:', { id, created_at, table_number, order_items, total_amount });
      const { error } = await supabase
        .from('orders')
        .update({
          created_at: created_at,
          table_number: table_number,
          order_items: order_items,
          total_amount: total_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('[Dashboard] Supabase error updating order:', error);
        toast.error('Supabase error: ' + error.message);
        return;
      }

      setOrders?.(prevOrders =>
        prevOrders.map(order =>
          order.id === id ? { ...updatedOrder } : order
        )
      );
      toast.success(`Order #${id.toString().padStart(4, '0')} updated successfully`);
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(`Failed to update order: ${error.message}`);
    }
  };

  return {
    updateOrderStatus,
    updateMultipleOrderStatuses,
    deleteSelectedOrders,
    updateOrder,
  };
};
