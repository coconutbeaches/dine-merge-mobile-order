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
      // Fetch all orders within the date range using rpc_admin_get_orders
      const { data: orders, error: ordersError } = await supabase.rpc('rpc_admin_get_orders', {
        p_start: startDate,
        p_end: endDate,
        p_limit: 99999, // Fetch all relevant orders for aggregation
        p_offset: 0,
        p_search: null,
        p_status: null,
      })

      if (ordersError) throw new Error(ordersError.message)

      // Aggregate data by date and customer type
      const dailyDataMap = new Map<string, OrdersByDate>()

      orders?.forEach(order => {
        const orderDate = format(new Date(order.created_at), 'yyyy-MM-dd')

        if (!dailyDataMap.has(orderDate)) {
          dailyDataMap.set(orderDate, {
            order_date: orderDate,
            hotel_guest_orders: 0,
            hotel_guest_revenue: 0,
            outside_guest_orders: 0,
            outside_guest_revenue: 0,
          })
        }

        const dailyEntry = dailyDataMap.get(orderDate)!

        // Determine customer type based on logic from DailySalesSummary
        let isWalkin = false;
        let isHotelGuest = false;

        if (order.user_id) {
          isHotelGuest = true;
        } else if (order.stay_id && !order.stay_id.toLowerCase().startsWith('walkin')) {
          isHotelGuest = true;
        } else if (order.stay_id?.toLowerCase().startsWith('walkin') || order.table_number === 'Take Away' || (order.table_number && !isNaN(Number(order.table_number)))) {
          isWalkin = true;
        }

        const amount = parseFloat(order.total_amount || '0')

        if (isHotelGuest) {
          dailyEntry.hotel_guest_orders += 1
          dailyEntry.hotel_guest_revenue += amount
        } else if (isWalkin) {
          dailyEntry.outside_guest_orders += 1
          dailyEntry.outside_guest_revenue += amount
        } else {
          // Fallback for uncategorized orders, add to walkin as a default
          dailyEntry.outside_guest_orders += 1
          dailyEntry.outside_guest_revenue += amount
        }
      })

      // Convert map to array and sort by date
      const aggregatedData = Array.from(dailyDataMap.values()).sort((a, b) => a.order_date.localeCompare(b.order_date))

      return aggregatedData as OrdersByDate[]
    },
    staleTime: 30 * 1000, // 30 seconds for order data
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: Boolean(startDate && endDate),
  })
}
