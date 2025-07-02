import { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, Profile } from '@/types/supabaseTypes';
import { toast } from 'sonner';

const PAGE_SIZE = 20; // Number of orders to fetch per page

// Define the shape of an order with customer details
export type OrderWithCustomerDetails = Order & {
  customer_name_from_profile?: string | null;
  customer_email_from_profile?: string | null;
  profiles?: Pick<Profile, 'name' | 'email'> | null; // For Supabase join
};


const normalizeOrderStatus = (status: string | null | undefined): OrderStatus => {
  if (status === 'out_for_delivery') return 'delivery';
  if (status && ['new', 'preparing', 'ready', 'delivery', 'completed', 'paid', 'cancelled'].includes(status)) {
    return status as OrderStatus;
  }
  return 'new'; // Default status
};

const fetchOrdersPage = async ({ pageParam = 0 }: { pageParam?: number }) => {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  console.log(`Fetching orders page: ${pageParam}, range: ${from}-${to}`);

  // Fetch orders and related profile information (name, email)
  // The syntax for joins: table_to_join(columns_to_select_from_joined_table)
  // If user_id is a foreign key to profiles.id, Supabase can join them.
  // Assuming 'user_id' in 'orders' table references 'id' in 'profiles' table.
  const { data: ordersData, error, count } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (
        name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching orders:', error);
    toast.error(`Failed to fetch orders: ${error.message}`);
    throw new Error(error.message || 'Failed to fetch orders');
  }

  if (!ordersData) {
    console.warn('No order data returned from Supabase.');
    return { data: [], nextPage: undefined, totalCount: 0 };
  }

  const transformedOrders: OrderWithCustomerDetails[] = ordersData.map((order: any) => ({
    ...order,
    order_status: normalizeOrderStatus(order.order_status),
    // Extract profile data if join was successful
    customer_name_from_profile: order.profiles?.name || null,
    customer_email_from_profile: order.profiles?.email || null,
  }));

  // Note: 'count' from Supabase with .range() might be the total count in the table if `exact` option is true,
  // or it might be the count of returned rows. For infinite scroll, we rely on whether fewer items than PAGE_SIZE are returned.
  // For a more accurate total count for pagination UI, a separate count query would be needed.
  // Here, we determine `nextPage` based on whether a full page was fetched.
  const totalCount = count ?? 0; // Placeholder if Supabase provides total count, otherwise needs separate query

  console.log(`Fetched ${transformedOrders.length} orders. Supabase count: ${count}`);

  return {
    data: transformedOrders,
    nextPage: transformedOrders.length === PAGE_SIZE ? pageParam + 1 : undefined,
    totalCount, // This might not be the true total count of all orders.
  };
};

export const useFetchOrders = () => {
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    error,
    refetch,
  } = useInfiniteQuery<
    { data: OrderWithCustomerDetails[]; nextPage: number | undefined; totalCount: number },
    Error
  >(
    ['orders'], // Query key
    fetchOrdersPage,
    {
      getNextPageParam: (lastPage) => lastPage.nextPage,
      // staleTime: 5 * 60 * 1000, // Optional: 5 minutes
    }
  );

  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime-update')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Real-time order update received:', payload);
          // Invalidate the orders query to refetch data.
          // More granular updates would be more performant for very active systems.
          // For example, queryClient.setQueryData to update a specific order.
          // For now, simple invalidation is fine.
          // Consider fetching profile data if a new order comes in with a new user_id not yet in cache.

          // A simple approach: refetch all.
          // refetch();
          // Or, more targeted:
          queryClient.invalidateQueries(['orders']);

          // Example of more granular update (more complex to implement fully):
          // const { eventType, new: newRecord, old: oldRecord, table } = payload;
          // queryClient.setQueryData(['orders'], (currentData: any) => {
          //   if (!currentData || !currentData.pages) return currentData;
          //   // Logic to find and update/add/delete the specific order in currentData.pages
          //   return updatedData;
          // });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, refetch]);

  const orders = data?.pages.flatMap(page => page.data) ?? [];

  return {
    orders,
    isLoading,
    isFetchingNextPage,
    error,
    fetchNextPage,
    hasNextPage,
    refetch,
    // setOrders is not directly provided with useInfiniteQuery in this pattern.
    // Mutations (add, update, delete) should use useMutation and update the query cache.
  };
};
