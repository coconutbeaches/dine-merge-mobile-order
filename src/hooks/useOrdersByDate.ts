import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

type OrdersByDate = {
  order_date: string
  hotel_guest_orders: number
  hotel_guest_revenue: number
  outside_guest_orders: number
  outside_guest_revenue: number
}

export const useOrdersByDate = (
  startDate: string,
  endDate: string,
  metric: 'revenue' | 'count'
) => {
  return useQuery({
    queryKey: ['orders-by-date', startDate, endDate, metric],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('orders_by_day_and_guest_type', {
        start_date: startDate,
        end_date: endDate,
      })
      if (error) throw new Error(error.message)
      return data as OrdersByDate[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for analytics data
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: Boolean(startDate && endDate),
  })
}
