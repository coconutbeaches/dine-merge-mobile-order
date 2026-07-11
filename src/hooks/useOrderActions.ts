
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { deleteAdminOrders } from '@/services/orderService';
import { getRemainingSelectedOrderIds, removeDeletedOrders } from '@/lib/adminOrderDelete';

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
      
      // Invalidate specific queries instead of broad invalidation
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['productOrders'] });
      
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
      
      // Invalidate specific queries for each order
      orderIds.forEach(orderId => {
        queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      toast.success(`Bulk status set to ${newStatus} for ${orderIds.length} orders`);
    } catch (e: any) {
      toast.error("Bulk update failed: " + e.message);
    }
  };

  const deleteSelectedOrders = async (
    selectedOrders: Array<number | string>,
    setSelectedOrders: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    if (selectedOrders.length === 0) return;

    try {
      // Default-denied by RLS for the browser client; delete via the admin
      // server route (service role) and only drop confirmed-deleted rows.
      const deletedIds = await deleteAdminOrders(selectedOrders);
      if (deletedIds.length === 0) {
        throw new Error('No matching orders were deleted');
      }

      setOrders?.(prevOrders => removeDeletedOrders(prevOrders, deletedIds));
      setSelectedOrders(prevSelected => getRemainingSelectedOrderIds(prevSelected, deletedIds));

      // Invalidate specific queries for the orders that were actually deleted
      deletedIds.forEach(orderId => {
        queryClient.invalidateQueries({ queryKey: ['order', String(orderId)] });
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      if (deletedIds.length < selectedOrders.length) {
        toast.warning(`Deleted ${deletedIds.length} of ${selectedOrders.length} selected orders`);
      } else {
        toast.success(`Deleted ${deletedIds.length} orders`);
      }
    } catch (error: any) {
      // Leave rows visible on failure and surface the error.
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
      
      // Invalidate specific order query after update
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      toast.success(`Order ${id} updated successfully`);
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
