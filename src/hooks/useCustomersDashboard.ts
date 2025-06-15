
import { useFetchCustomers } from './useFetchCustomers';
import { useCustomerActions } from './useCustomerActions';
import { useCustomerSelection } from './useCustomerSelection';

export const useCustomersDashboard = () => {
  const { customers, setCustomers, isLoading, fetchCustomers } = useFetchCustomers();
  const { 
    selectedCustomers, 
    setSelectedCustomers, 
    toggleSelectCustomer, 
    selectAllCustomers, 
    clearSelection 
  } = useCustomerSelection(customers);
  
  const { 
    deleteSelectedCustomers: deleteCustomersAction 
  } = useCustomerActions(setCustomers);

  const deleteSelectedCustomers = () => {
    deleteCustomersAction(selectedCustomers, setSelectedCustomers);
  };
  
  return {
    customers,
    isLoading,
    fetchCustomers,
    selectedCustomers,
    deleteSelectedCustomers,
    toggleSelectCustomer,
    selectAllCustomers,
    clearSelection,
  };
};
