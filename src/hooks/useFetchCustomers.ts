import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GroupedCustomer } from '@/types/supabaseTypes';
import { toast } from 'sonner';

// Maximum number of retry attempts
const MAX_RETRIES = 3;
// Delay between retries in milliseconds
const RETRY_DELAY = 1000;
// Cache for customer data to avoid refetching
let customerCache: { data: GroupedCustomer[]; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

export const useFetchCustomers = () => {
  const [customers, setCustomers] = useState<GroupedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCustomers = useCallback(async (retryCount = 0, forceRefresh = false): Promise<void> => {
    // Check cache first unless force refresh is requested
    if (!forceRefresh && customerCache && Date.now() - customerCache.timestamp < CACHE_DURATION) {
      console.log('Using cached customer data');
      setCustomers(customerCache.data);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching customers from database...');
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

      const customerData = data as GroupedCustomer[];
      setCustomers(customerData);
      
      // Update cache with fresh data
      customerCache = {
        data: customerData,
        timestamp: Date.now()
      };
      
      console.log('Successfully fetched', customerData.length, 'grouped customers (auth users + guest families)');
      console.log('Sample customer data:', customerData[0]);
      
      // Count auth users vs guest families
      const authUsers = customerData.filter(c => c.customer_type === 'auth_user').length;
      const guestFamilies = customerData.filter(c => c.customer_type === 'guest_family').length;
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
    
    // Set up realtime connection reliability
    supabase.realtime.on('open', () => {
      console.log('Realtime connection open for customers');
    });

    supabase.realtime.on('close', () => {
      console.log('Realtime connection closed for customers');
      toast('Realtime disconnected – attempting to reconnect…');
      startExponentialBackoffCustomers();
    });

    supabase.realtime.on('error', (error) => {
      console.error('Realtime connection error for customers:', error);
      toast('Realtime connection error. Check your connection.');
    });
    
  }, [fetchCustomers]);

  function startExponentialBackoffCustomers() {
    let attempt = 0;
    const maxAttempts = 6;

    const interval = setInterval(() => {
      attempt += 1;
      if (attempt >= maxAttempts) {
        clearInterval(interval);
        console.error('Max reconnect attempts reached for customers. Please try again later.');
        return;
      }
      fetchCustomers();
    }, Math.min(1000 * 2 ** attempt, 30000));
  }

  return { 
    customers, 
    setCustomers, 
    isLoading, 
    error,
    fetchCustomers 
  };
};
