
import { useState, useCallback } from 'react';
import { Order } from '@/types/supabaseTypes';

export const useOrderSelection = (orders: Order[]) => {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  const toggleSelectOrder = useCallback((orderId: number) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  }, []);

  const selectAllOrders = useCallback((orderIds?: number[]) => {
    const idsToSelect = orderIds || orders.map(order => order.id);
    setSelectedOrders(idsToSelect);
  }, [orders]);

  const clearSelection = useCallback(() => {
    setSelectedOrders([]);
  }, []);

  return {
    selectedOrders,
    setSelectedOrders,
    toggleSelectOrder,
    selectAllOrders,
    clearSelection
  };
};
