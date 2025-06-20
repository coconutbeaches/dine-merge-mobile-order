import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

type OrdersByDate = {
  order_date: string
  guest_amount: number
  non_guest_amount: number
}

export const useOrdersByDate = (startDate: string, endDate: string) => {
  const [data, setData] = useState<OrdersByDate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const { data, error } = await supabase.rpc('orders_by_day_and_guest_type', {
        start_date: startDate,
        end_date: endDate
      })
      if (error) setError(error.message)
      else setData(data as OrdersByDate[])
      setIsLoading(false)
    }

    fetchData()
  }, [startDate, endDate])

  return { data, isLoading, error }
}
