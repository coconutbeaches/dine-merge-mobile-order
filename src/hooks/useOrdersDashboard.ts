
import { useFetchOrders } from './useFetchOrders';
import { useOrderActions } from './useOrderActions';
import { useOrderSelection } from './useOrderSelection';

export const useOrdersDashboard = () => {
  const { orders, setOrders, isLoading, fetchOrders } = useFetchOrders();
  const { 
    selectedOrders, 
    setSelectedOrders, 
    toggleSelectOrder, 
    selectAllOrders, 
    clearSelection 
  } = useOrderSelection(orders);
  
  const { 
    updateOrderStatus, 
    updateMultipleOrderStatuses, 
    deleteSelectedOrders: deleteOrdersAction 
  } = useOrderActions(setOrders);

  const deleteSelectedOrders = () => {
    deleteOrdersAction(selectedOrders, setSelectedOrders);
  };
  
  return {
    orders,
    isLoading,
    fetchOrders,
    selectedOrders,
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    selectAllOrders,
    clearSelection,
    updateMultipleOrderStatuses,
  };
};
