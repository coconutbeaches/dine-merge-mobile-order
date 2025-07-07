
import { useFetchOrders } from './useFetchOrders';
import { useOrderActions } from './useOrderActions';
import { useOrderSelection } from './useOrderSelection';

export const useOrdersDashboard = () => {
  const { orders, setOrders, isLoading, isLoadingMore, hasMore, fetchOrders, loadMore } = useFetchOrders();
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
    isLoadingMore,
    hasMore,
    fetchOrders,
    loadMore,
    selectedOrders,
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    selectAllOrders,
    clearSelection,
    updateMultipleOrderStatuses,
  };
};
