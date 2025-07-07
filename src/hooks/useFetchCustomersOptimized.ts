import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OptimizedCustomer {
  customer_id: string;
  name: string;
  customer_type: 'auth_user' | 'guest_family';
  total_spent: number;
  last_order_date: string | null;
  archived: boolean;
  joined_at: string;
}

export const useFetchCustomersOptimized = () => {
  const [customers, setCustomers] = useState<OptimizedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchCustomers = useCallback(async (
    reset = false, 
    includeArchived = false
  ) => {
    const currentPage = reset ? 0 : page;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .rpc('get_all_customers_with_total_spent_grouped', {
          p_limit: pageSize,
          p_offset: currentPage * pageSize,
          p_include_archived: includeArchived
        });

      if (error) {
        console.error('Supabase RPC error:', error);
        throw new Error(error.message || 'Failed to fetch customers');
      }

      if (data) {
        const transformedCustomers = data as OptimizedCustomer[];

        if (reset) {
          setCustomers(transformedCustomers);
          setPage(1);
        } else {
          setCustomers(prev => [...prev, ...transformedCustomers]);
          setPage(prev => prev + 1);
        }

        setHasMore(data.length === pageSize);
        console.log(`[Optimized] Fetched ${data.length} customers (page ${currentPage + 1})`);
      } else {
        if (reset) {
          setCustomers([]);
        }
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      toast.error(`Failed to fetch customers: ${err.message}`);
      if (reset) {
        setCustomers([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  const resetAndFetch = useCallback((includeArchived = false) => {
    setPage(0);
    setHasMore(true);
    setCustomers([]);
    fetchCustomers(true, includeArchived);
  }, [fetchCustomers]);

  const loadMore = useCallback((includeArchived = false) => {
    if (!isLoading && hasMore) {
      fetchCustomers(false, includeArchived);
    }
  }, [fetchCustomers, isLoading, hasMore]);

  return {
    customers,
    setCustomers,
    isLoading,
    fetchCustomers: resetAndFetch,
    loadMore,
    hasMore
  };
};
