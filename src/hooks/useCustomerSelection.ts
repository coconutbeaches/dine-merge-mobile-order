
import { useState, useCallback } from 'react';
import { Profile } from '@/types/supabaseTypes';

export const useCustomerSelection = (customers: Profile[]) => {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);

  const toggleSelectCustomer = useCallback((customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  }, []);

  const selectAllCustomers = useCallback((customerIds?: string[]) => {
    const idsToSelect = customerIds || customers.map(customer => customer.id);
    setSelectedCustomers(idsToSelect);
  }, [customers]);

  const clearSelection = useCallback(() => {
    setSelectedCustomers([]);
  }, []);

  return {
    selectedCustomers,
    setSelectedCustomers,
    toggleSelectCustomer,
    selectAllCustomers,
    clearSelection
  };
};
