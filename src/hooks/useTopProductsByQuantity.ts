import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TopProductQuantity = {
  product_id: string;
  product_name: string;
  hotel_guest_quantity: number;
  non_guest_quantity: number;
  total_quantity: number;
};

export const useTopProductsByQuantity = (
  startDate: string,
  endDate: string,
) => {
  const { data, isLoading, error } = useQuery<TopProductQuantity[], Error>({
    queryKey: ['topProducts', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('top_products_by_quantity', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) {
        console.error('Error fetching top products:', error);
        throw error;
      }

      return data || [];
    },
  });

  return { data: data || [], isLoading, error };
};
