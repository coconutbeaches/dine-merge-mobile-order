import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExtendedOrder } from '@/src/types/app';

interface FilterOptions {
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface OrderRow {
  id: number;
  user_id: string | null;
  guest_user_id: string | null;
  guest_first_name: string | null;
  stay_id: string | null;
  table_number: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
  order_status: string;
  order_items: unknown[];
  special_instructions: string | null;
  customer_name: string | null;
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
}

const REQUEST_TIMEOUT_MS = 12000;
const PAGE_SIZE = 50;

const escapeSearch = (value: string) => value.replace(/[%(),]/g, '').trim();

export const useFetchOrdersOptimized = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(0);
  const filtersRef = useRef<FilterOptions>({});
  const inFlightRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const buildQuery = useCallback((page: number, filters: FilterOptions) => {
    let query = supabase
      .from('orders')
      .select(`
        id,
        user_id,
        guest_user_id,
        guest_first_name,
        stay_id,
        table_number,
        total_amount,
        created_at,
        updated_at,
        order_status,
        order_items,
        special_instructions,
        customer_name
      `)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filters.status) {
      query = query.eq('order_status', filters.status);
    }
    if (filters.startDate) {
      query = query.gte('created_at', new Date(filters.startDate).toISOString());
    }
    if (filters.endDate) {
      query = query.lte('created_at', new Date(filters.endDate).toISOString());
    }
    if (filters.search?.trim()) {
      const search = escapeSearch(filters.search);
      if (search.length > 0) {
        query = query.or(
          `customer_name.ilike.%${search}%,guest_first_name.ilike.%${search}%,stay_id.ilike.%${search}%,table_number.ilike.%${search}%`,
        );
      }
    }

    return query;
  }, []);

  const fetchProfilesById = useCallback(async (rows: OrderRow[]) => {
    const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean) as string[])];
    if (userIds.length === 0) {
      return new Map<string, ProfileRow>();
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);

    if (profileError || !data) {
      return new Map<string, ProfileRow>();
    }

    return new Map<string, ProfileRow>(data.map((profile) => [profile.id, profile]));
  }, []);

  const mapRows = useCallback(
    async (rows: OrderRow[]): Promise<ExtendedOrder[]> => {
      const profilesById = await fetchProfilesById(rows);
      return rows.map((row) => {
        const profile = row.user_id ? profilesById.get(row.user_id) : undefined;
        const customerName = row.customer_name || profile?.name || row.guest_first_name || null;
        const customerEmail = profile?.email || null;

        return {
          ...row,
          customer_name: customerName,
          customer_email: customerEmail,
          formattedStayId: `${row.stay_id || ''}-${row.table_number || ''}`,
        } as ExtendedOrder;
      });
    },
    [fetchProfilesById],
  );

  const fetchOrders = useCallback(
    async (reset = false, customFilters?: FilterOptions) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const requestId = ++latestRequestIdRef.current;
      const page = reset ? 0 : pageRef.current;
      const isInitialLoad = reset || page === 0;
      const filters = customFilters || filtersRef.current;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (isInitialLoad) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const queryPromise = (async () => {
          const { data, error: queryError } = await buildQuery(page, filters);
          if (queryError) throw queryError;
          return (data || []) as OrderRow[];
        })();

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Orders request timeout')), REQUEST_TIMEOUT_MS);
        });

        const rows = await Promise.race([queryPromise, timeoutPromise]);
        const transformed = await mapRows(rows);

        if (requestId !== latestRequestIdRef.current) return;

        if (isInitialLoad) {
          setOrders(transformed);
          pageRef.current = 1;
        } else {
          setOrders((prev) => [...prev, ...transformed]);
          pageRef.current += 1;
        }
        setHasMore(rows.length === PAGE_SIZE);
      } catch (err) {
        if (requestId !== latestRequestIdRef.current) return;
        const message =
          err instanceof Error && err.message === 'Orders request timeout'
            ? 'Orders are loading slowly. Please retry.'
            : 'Failed to fetch orders.';
        setError(message);
        toast.error(message);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (requestId === latestRequestIdRef.current) {
          if (isInitialLoad) setIsLoading(false);
          else setIsLoadingMore(false);
        }
        inFlightRef.current = false;
      }
    },
    [buildQuery, mapRows],
  );

  const resetAndFetch = useCallback(() => {
    pageRef.current = 0;
    setHasMore(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchOrders(false);
    }
  }, [fetchOrders, hasMore, isLoadingMore]);

  const setFilters = useCallback(
    (newFilters: FilterOptions) => {
      filtersRef.current = newFilters;
      pageRef.current = 0;
      setHasMore(true);
      fetchOrders(true, newFilters);
    },
    [fetchOrders],
  );

  useEffect(() => {
    resetAndFetch();
  }, [resetAndFetch]);

  return {
    orders,
    setOrders,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    fetchOrders: resetAndFetch,
    loadMore,
    setFilters,
  };
};
