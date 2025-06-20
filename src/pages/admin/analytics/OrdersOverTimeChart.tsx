import React from 'react'
import Layout from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useOrdersByDate } from '@/hooks/useOrdersByDate'
import { format, subDays } from 'date-fns'

const OrdersOverTimeChart = () => {
  const endDate = format(new Date(), 'yyyy-MM-dd')
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const { data, isLoading, error } = useOrdersByDate(startDate, endDate)

  const chartData = data.map((row) => ({
    date: row.order_date,
    hotel_guest: row.guest_amount,
    non_guest: row.non_guest_amount,
  }))

  return (
    <Layout title="Orders Over Time" showBackButton>
      <div className="p-4 md:p-6">
        <Card className="bg-white text-black dark:bg-black dark:text-white border border-black">
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading analytics...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">Failed to load data</div>
            ) : (
              <ChartContainer
                config={{
                  hotel_guest: { label: 'Hotel Guest', color: '#000' },
                  non_guest: { label: 'Non Guest', color: '#888' },
                }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" stroke="#000" />
                    <YAxis stroke="#000" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="hotel_guest" stackId="orders" fill="var(--color-hotel_guest)" />
                    <Bar dataKey="non_guest" stackId="orders" fill="var(--color-non_guest)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default OrdersOverTimeChart
