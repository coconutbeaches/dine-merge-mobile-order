
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabaseTypes';
import { toast } from 'sonner';

export const useFetchCustomers = () => {
  const [customers, setCustomers] = useState<(Profile & { total_spent: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_customers_with_total_spent');

      if (error) throw error;

      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error(`Failed to fetch customers: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return { customers, setCustomers, isLoading, fetchCustomers };
};
