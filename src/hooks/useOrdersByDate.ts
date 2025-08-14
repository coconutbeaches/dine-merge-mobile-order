import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { format } from 'date-fns'

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
      // Use optimized server-side aggregation instead of client-side processing
      const { data, error } = await supabase.rpc('get_orders_analytics_by_date_range', {
        p_start_date: `${startDate}T00:00:00Z`,
        p_end_date: `${endDate}T23:59:59Z`
      })

      if (error) throw new Error(error.message)

      // Transform to match expected interface
      const aggregatedData: OrdersByDate[] = (data || []).map(row => ({
        order_date: row.order_date,
        hotel_guest_orders: row.hotel_guest_orders || 0,
        hotel_guest_revenue: parseFloat(row.hotel_guest_revenue || '0'),
        outside_guest_orders: row.outside_guest_orders || 0,
        outside_guest_revenue: parseFloat(row.outside_guest_revenue || '0'),
      }))

      return aggregatedData
    },
    staleTime: 60 * 1000, // 1 minute cache for aggregated data
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: Boolean(startDate && endDate),
  })
}
