import { useFetchCustomers } from './useFetchCustomers';
import { useCustomerActions } from './useCustomerActions';
import { useCustomerSelection } from './useCustomerSelection';
import { useState, useMemo } from 'react';

type SortKey = 'name' | 'total_spent' | 'last_order_date' | 'created_at' | 'customer_type';
type SortDirection = 'asc' | 'desc';

export const useCustomersDashboard = () => {
  const [sortKey, setSortKey] = useState<SortKey>('last_order_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Defensive hook calls with error handling
  let fetchCustomersResult;
  try {
    fetchCustomersResult = useFetchCustomers();
  } catch (error) {
    console.error('Error in useFetchCustomers:', error);
    fetchCustomersResult = {
      customers: [],
      setCustomers: () => {},
      isLoading: false,
      error: new Error('Failed to initialize customers hook'),
      fetchCustomers: () => Promise.resolve()
    };
  }
  
  const { 
    customers = [], 
    setCustomers = () => {}, 
    isLoading = false, 
    error = null,
    fetchCustomers = () => Promise.resolve()
  } = fetchCustomersResult || {};
  
  let customerSelectionResult;
  try {
    customerSelectionResult = useCustomerSelection(customers || []);
  } catch (error) {
    console.error('Error in useCustomerSelection:', error);
    customerSelectionResult = {
      selectedCustomers: [],
      setSelectedCustomers: () => {},
      toggleSelectCustomer: () => {},
      selectAllCustomers: () => {},
      clearSelection: () => {}
    };
  }
  
  const { 
    selectedCustomers = [], 
    setSelectedCustomers = () => {}, 
    toggleSelectCustomer = () => {}, 
    selectAllCustomers = () => {}, 
    clearSelection = () => {}
  } = customerSelectionResult || {};
  
  let customerActionsResult;
  try {
    customerActionsResult = useCustomerActions(setCustomers);
  } catch (error) {
    console.error('Error in useCustomerActions:', error);
    customerActionsResult = {
      deleteSelectedCustomers: () => Promise.resolve()
    };
  }
  
  const { 
    deleteSelectedCustomers: deleteCustomersAction = () => Promise.resolve()
  } = customerActionsResult || {};

  const deleteSelectedCustomers = () => {
    deleteCustomersAction(selectedCustomers, setSelectedCustomers);
  };

  const sortedCustomers = useMemo(() => {
    if (!customers) return [];

    const customersArray = Array.isArray(customers) ? customers : [];

    return [...customersArray].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortKey) {
        case 'name':
          valA = a.name || '';
          valB = b.name || '';
          break;
        case 'total_spent':
          valA = a.total_spent || 0;
          valB = b.total_spent || 0;
          break;
        case 'last_order_date':
          // For desc order: customers with recent orders come first, null values go to end
          // For asc order: null values come first, then oldest to newest
          valA = a.last_order_date ? new Date(a.last_order_date).getTime() : (sortDirection === 'desc' ? 0 : Infinity);
          valB = b.last_order_date ? new Date(b.last_order_date).getTime() : (sortDirection === 'desc' ? 0 : Infinity);
          break;
        case 'created_at':
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
          break;
        case 'customer_type':
          valA = a.customer_type || '';
          valB = b.customer_type || '';
          break;
        default:
          return 0;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [customers, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  return {
    customers: sortedCustomers,
    setCustomers,
    isLoading,
    error,
    fetchCustomers,
    selectedCustomers,
    deleteSelectedCustomers,
    toggleSelectCustomer,
    selectAllCustomers,
    clearSelection,
    sortKey,
    sortDirection,
    handleSort,
  };
};
