import { useFetchOrders } from './useFetchOrders'; // The new hook using useInfiniteQuery
import { useOrderActions } from './useOrderActions';
import { useOrderSelection } from './useOrderSelection';
import { useQueryClient } from '@tanstack/react-query';
import { OrderStatus } from '@/types/supabaseTypes';

export const useOrdersDashboard = () => {
  const queryClient = useQueryClient();
  const {
    orders, // Flattened list from useInfiniteQuery
    isLoading,
    error, // Added error for completeness
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch // From useFetchOrders, for manual refresh
  } = useFetchOrders();

  const { 
    selectedOrders, 
    setSelectedOrders, 
    toggleSelectOrder, 
    selectAllOrders, 
    clearSelection 
  } = useOrderSelection(orders); // Operates on the flattened list
  
  // useOrderActions likely expects a 'setOrders' function.
  // We'll replace this with query invalidation for now.
  // A more robust solution would be to refactor useOrderActions to use React Query mutations.
  const { 
    updateOrderStatus: originalUpdateOrderStatus,
    updateMultipleOrderStatuses: originalUpdateMultipleOrderStatuses,
    deleteSelectedOrders: deleteOrdersAction 
  } = useOrderActions(() => queryClient.invalidateQueries(['orders']));

  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    await originalUpdateOrderStatus(orderId, newStatus);
    queryClient.invalidateQueries(['orders']);
  };

  const updateMultipleOrderStatuses = async (orderIds: number[], newStatus: OrderStatus) => {
    await originalUpdateMultipleOrderStatuses(orderIds, newStatus);
    queryClient.invalidateQueries(['orders']);
  };

  const deleteSelectedOrders = async () => {
    // Assuming deleteOrdersAction was modified or can work with an invalidation callback
    await deleteOrdersAction(selectedOrders, setSelectedOrders);
    queryClient.invalidateQueries(['orders']); // Ensure data is refetched after deletion
  };
  
  return {
    orders, // Flattened list
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetchOrders: refetch, // Expose refetch
    selectedOrders,
    setSelectedOrders, // Pass through
    updateOrderStatus,
    deleteSelectedOrders,
    toggleSelectOrder,
    selectAllOrders,
    clearSelection,
    updateMultipleOrderStatuses,
    // setOrders is removed
  };
};
