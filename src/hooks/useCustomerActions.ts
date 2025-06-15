
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabaseTypes';
import { toast } from 'sonner';

export const useCustomerActions = <T extends Profile>(
  setCustomers: React.Dispatch<React.SetStateAction<T[]>>
) => {
  const deleteSelectedCustomers = async (
    selectedCustomers: string[], 
    setSelectedCustomers: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (selectedCustomers.length === 0) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedCustomers.includes(user.id)) {
        toast.error("You cannot delete your own account from the dashboard.");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', selectedCustomers);
        
      if (error) throw error;
      
      setCustomers(prevCustomers => 
        prevCustomers.filter(customer => !selectedCustomers.includes(customer.id))
      );
      setSelectedCustomers([]);
      
      toast.success(`Deleted ${selectedCustomers.length} customer(s)`);
    } catch (error: any) {
      console.error('Error deleting customers:', error);
      toast.error(`Failed to delete customers: ${error.message}`);
    }
  };

  return {
    deleteSelectedCustomers,
  };
};
