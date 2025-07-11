import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GroupedCustomer } from '@/types/supabaseTypes';
import { toast } from 'sonner';

// Maximum number of retry attempts
const MAX_RETRIES = 3;
// Delay between retries in milliseconds
const RETRY_DELAY = 1000;

export const useFetchCustomers = () => {
  const [customers, setCustomers] = useState<GroupedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomers = useCallback(async (retryCount = 0): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching customers...');
      const { data, error: supabaseError } = await supabase
        .rpc('get_customers_with_total_spent');

      if (supabaseError) {
        console.error('Supabase RPC error in get_customers_with_total_spent:', supabaseError);
        // If the function doesn't exist, fall back to basic query for auth users only
        if (supabaseError.message?.includes('could not find') || supabaseError.code === 'PGRST202') {
          console.log('Function not found, using fallback query for auth users only...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('*')
            .order('name');
          
          if (fallbackError) {
            throw new Error(fallbackError.message || 'Failed to fetch customers');
          }
          
          // Convert profiles to GroupedCustomer format
          const customersWithDummyData: GroupedCustomer[] = (fallbackData || [])
            .filter(profile => !profile.deleted) // Exclude deleted customers
            .map(profile => ({
              customer_id: profile.id,
              name: profile.name || 'Unnamed Customer',
              customer_type: 'auth_user' as const,
              total_spent: 0,
              last_order_date: null,
              archived: profile.archived || false,
              deleted: profile.deleted || false,
              joined_at: profile.created_at
            }));
          
          setCustomers(customersWithDummyData);
          console.log('Successfully fetched', customersWithDummyData.length, 'customers (fallback)');
          return;
        }
        throw new Error(supabaseError.message || 'Failed to fetch customers');
      }

      if (!data) {
        throw new Error('No data returned from server');
      }

      setCustomers(data as GroupedCustomer[]);
      console.log('Successfully fetched', data.length, 'grouped customers (auth users + guest families)');
      console.log('Sample customer data:', data[0]);
      
      // Count auth users vs guest families
      const authUsers = data.filter(c => c.customer_type === 'auth_user').length;
      const guestFamilies = data.filter(c => c.customer_type === 'guest_family').length;
      console.log(`Auth users: ${authUsers}, Guest families: ${guestFamilies}`);
    } catch (err: any) {
      console.error('Error in fetchCustomers:', err);
      
      // If we haven't reached max retries, try again
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => fetchCustomers(retryCount + 1), RETRY_DELAY * (retryCount + 1));
        return;
      }
      
      // If we've exhausted all retries, show error
      const errorMessage = err.message || 'Failed to fetch customers. Please check your internet connection and try again.';
      setError(new Error(errorMessage));
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { 
    customers, 
    setCustomers, 
    isLoading, 
    error,
    fetchCustomers 
  };
};
