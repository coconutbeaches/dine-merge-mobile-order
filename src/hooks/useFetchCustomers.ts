import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabaseTypes';
import { toast } from 'sonner';

// Maximum number of retry attempts
const MAX_RETRIES = 3;
// Delay between retries in milliseconds
const RETRY_DELAY = 1000;

export const useFetchCustomers = () => {
  const [customers, setCustomers] = useState<(
    Profile & { total_spent: number; last_order_date: string | null }
  )[]>([]);
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
        throw new Error(supabaseError.message || 'Failed to fetch customers');
      }

      if (!data) {
        throw new Error('No data returned from server');
      }

      // Also fetch avatar URLs for each profile to persist uploaded images
      const ids = data.map((c: any) => c.id);
      const { data: avatarsData } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', ids);
      const avatarMap: Record<string, string | null> = {};
      if (avatarsData) {
        avatarsData.forEach(row => {
          avatarMap[row.id] = row.avatar_url;
        });
      }
      // Merge avatar_url into customer records
      const customersWithAvatars = data.map((c: any) => ({
        ...c,
        avatar_url: avatarMap[c.id] || null,
      }));
      setCustomers(customersWithAvatars);
      console.log('Successfully fetched', data.length, 'customers');
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
