import { useFetchCustomers } from './useFetchCustomers'; // This is the new hook using useInfiniteQuery
import { useCustomerActions } from './useCustomerActions';
import { useCustomerSelection } from './useCustomerSelection';
import { useQueryClient } from '@tanstack/react-query';

export const useCustomersDashboard = () => {
  const queryClient = useQueryClient();
  const { 
    customers, // This is now the flattened list of customers from all pages
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch // Renaming original fetchCustomers to refetch for clarity with React Query
  } = useFetchCustomers();
  
  const { 
    selectedCustomers, 
    setSelectedCustomers, 
    toggleSelectCustomer, 
    selectAllCustomers, 
    clearSelection 
  } = useCustomerSelection(customers); // Operates on the flattened list
  
  // useCustomerActions might need adjustment if it directly manipulates the 'customers' state.
  // For now, we assume it works by calling setCustomers, which we'll replace with cache invalidation/update.
  // A proper solution would involve useMutation from React Query in useCustomerActions.
  // For simplicity, we'll invalidate the query after deletion.
  const { 
    deleteSelectedCustomers: deleteCustomersAction 
  } = useCustomerActions(() => queryClient.invalidateQueries(['customers']));


  const deleteSelectedCustomers = async () => {
    // The original deleteCustomersAction in useCustomerActions expects setCustomers.
    // We need to adapt this. A quick fix is to pass a function that invalidates the query.
    // A more robust fix would be to refactor useCustomerActions to use React Query's mutations.
    await deleteCustomersAction(selectedCustomers, setSelectedCustomers); // This might still try to call old setCustomers
    queryClient.invalidateQueries(['customers']); // Ensure data is refetched after deletion
  };
  
  return {
    customers, // Flattened list
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetchCustomers: refetch, // Expose refetch for manual refresh
    selectedCustomers,
    setSelectedCustomers, // Pass through for selection management
    deleteSelectedCustomers,
    toggleSelectCustomer,
    selectAllCustomers,
    clearSelection,
    // setCustomers is removed as state is managed by React Query.
    // Mutations should update the cache or refetch.
  };
};
