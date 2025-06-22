import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type TopProductQuantity = {
  product_name: string
  hotel_guest_quantity: number
  non_guest_quantity: number
  total_quantity: number
}

export const useTopProductsByQuantity = (
  startDate: string,
  endDate: string,
) => {
  const [data, setData] = useState<TopProductQuantity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      const { data, error } = await supabase.rpc('top_products_by_quantity', {
        start_date: startDate,
        end_date: endDate,
      })
      if (error) setError(error.message)
      else setData((data ?? []) as TopProductQuantity[])
      setIsLoading(false)
    }
    fetchData()
  }, [startDate, endDate])

  return { data, isLoading, error }
}
