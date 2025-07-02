import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabaseTypes';
import { toast } from 'sonner';

const PAGE_SIZE = 20; // Define page size, can be adjusted

// Define the expected shape of a customer from the RPC
export type CustomerWithDetails = Profile & {
  total_spent: number;
  last_order_date: string | null; // Assuming this might still be part of Profile or added by RPC later
  avatar_url: string | null;
  customer_type: string | null; // Added from SQL function
};

// Define the shape of the data returned by the RPC
interface FetchedCustomerData extends CustomerWithDetails {
  total_count: number; // This comes from the SQL function
}

const fetchCustomersPage = async ({ pageParam = 0 }: { pageParam?: number }) => {
  console.log(`Fetching customers page: ${pageParam}`);
  const offset = pageParam * PAGE_SIZE;

  const { data, error } = await supabase.rpc('get_customers_with_total_spent', {
    page_size_param: PAGE_SIZE,
    offset_param: offset,
  });

  if (error) {
    console.error('Error fetching customers:', error);
    // Check for specific error indicating function might not be updated yet (common during development)
    if (error.message?.includes('function get_customers_with_total_spent(page_size_param => integer, offset_param => integer) does not exist')) {
        toast.error("Database function 'get_customers_with_total_spent' might not be updated to support pagination. Please apply database migrations.");
    } else {
        toast.error(`Failed to fetch customers: ${error.message}`);
    }
    throw new Error(error.message || 'Failed to fetch customers');
  }

  if (!data) {
    console.warn('No data returned from get_customers_with_total_spent RPC.');
    return { data: [], nextPage: undefined, totalCount: 0 };
  }

  const customers = data as FetchedCustomerData[];
  const totalCount = customers.length > 0 ? customers[0].total_count : 0;

  console.log(`Fetched ${customers.length} customers. Total available: ${totalCount}`);

  return {
    data: customers,
    nextPage: (pageParam + 1) * PAGE_SIZE < totalCount ? pageParam + 1 : undefined,
    totalCount,
  };
};

export const useFetchCustomers = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    error,
    refetch, // Added for manual refetching if needed
  } = useInfiniteQuery<
    { data: FetchedCustomerData[]; nextPage: number | undefined; totalCount: number },
    Error
  >(
    ['customers'], // Query key
    fetchCustomersPage,
    {
      getNextPageParam: (lastPage) => lastPage.nextPage,
      // Optional: configure staleTime, cacheTime, retry, etc.
      // staleTime: 5 * 60 * 1000, // 5 minutes
      // cacheTime: 10 * 60 * 1000, // 10 minutes
      onError: (err) => {
        // Toast error is already handled in fetchCustomersPage, but can add more here
        console.error("useInfiniteQuery error in useFetchCustomers:", err);
      }
    }
  );

  // Flatten pages into a single list of customers
  const customers = data?.pages.flatMap(page => page.data) ?? [];

  return {
    customers,
    isLoading,
    isFetchingNextPage,
    error,
    fetchNextPage,
    hasNextPage,
    refetch, // Expose refetch
    // For compatibility, we can derive a simple "setCustomers" if absolutely needed,
    // but ideally, mutations should go through React Query's mutation functions.
    // setCustomers: (newCustomers) => queryClient.setQueryData(['customers'], () => ({ pages: [{ data: newCustomers, nextPage: undefined, totalCount: newCustomers.length }], pageParams: [undefined] }))
  };
};
