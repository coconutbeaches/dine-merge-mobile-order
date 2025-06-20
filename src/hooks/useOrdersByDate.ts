import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrdersByDateRow {
  order_date: string;
  guest_type: 'hotel_guest' | 'outside_guest';
  total_amount: number;
}

type OrdersGrouped = {
  [date: string]: {
    hotel_guest: number;
    outside_guest: number;
  };
};

export function useOrdersByDate() {
  const [data, setData] = useState<OrdersGrouped>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const { data: rows, error } = await supabase.rpc('orders_by_day_and_guest_type');

      if (error) {
        setError(error);
        setIsLoading(false);
        return;
      }

      const grouped: OrdersGrouped = {};
      for (const row of (rows as OrdersByDateRow[]) || []) {
        if (!grouped[row.order_date]) {
          grouped[row.order_date] = { hotel_guest: 0, outside_guest: 0 };
        }
        grouped[row.order_date][row.guest_type] = row.total_amount;
      }

      setData(grouped);
      setIsLoading(false);
    }

    fetchData();
  }, []);

  return { data, isLoading, error } as const;
}
