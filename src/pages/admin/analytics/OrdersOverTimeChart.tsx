import React, { useState } from 'react'
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
import { DateRange } from 'react-day-picker'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatThaiCurrency } from '@/lib/utils'

const OrdersOverTimeChart = () => {
  const [metric, setMetric] = useState<'revenue' | 'count'>('revenue')
  const [range, setRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  const handleRangeSelect = (selected: DateRange | undefined) => {
    if (!selected) return
    if (selected.to && selected.from && selected.to < selected.from) {
      setRange({ from: selected.to, to: selected.from })
    } else {
      setRange(selected)
    }
  }

  const endDate = range.to ? format(range.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  const startDate = range.from ? format(range.from, 'yyyy-MM-dd') : endDate

  const { data, isLoading, error } = useOrdersByDate(startDate, endDate, metric)

  const chartData = data.map((row) => ({
    date: row.order_date,
    hotel_guest: metric === 'revenue' ? row.hotel_guest_revenue : row.hotel_guest_orders,
    non_guest: metric === 'revenue' ? row.outside_guest_revenue : row.outside_guest_orders,
  }))

  const total = chartData.reduce((sum, row) => sum + row.hotel_guest + row.non_guest, 0)

  return (
    <Layout title="Orders Over Time" showBackButton>
      <div className="p-4 md:p-6">
        <Card className="bg-white text-black dark:bg-black dark:text-white border border-black">
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
            <div className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="text-sm font-normal w-[260px] justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {range.from ? (
                        range.to ? (
                          <>{format(range.from, 'LLL dd, y')} - {format(range.to, 'LLL dd, y')}</>
                        ) : (
                          format(range.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={range.from}
                      selected={range}
                      onSelect={handleRangeSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <ToggleGroup
                  type="single"
                  value={metric}
                  onValueChange={(val) => val && setMetric(val as 'revenue' | 'count')}
                  className="ml-2"
                >
                  <ToggleGroupItem value="revenue">THB</ToggleGroupItem>
                  <ToggleGroupItem value="count">Orders</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="text-lg font-bold md:ml-auto">
                {metric === 'revenue' ? formatThaiCurrency(total) : total.toLocaleString()}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">Loading analytics...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">Failed to load data</div>
            ) : (
              <ChartContainer
                config={{
                  hotel_guest: { label: 'Hotel Guest', color: '#ffffff' },
                  non_guest: { label: 'Non Guest', color: '#000000' },
                }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis stroke="#000" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="non_guest" stackId="orders" fill="var(--color-non_guest)" />
                    <Bar dataKey="hotel_guest" stackId="orders" fill="var(--color-hotel_guest)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
          <div className="mt-2 font-mono text-sm">
            {/* Example: {JSON.stringify(chartData)} */}
          </div>
        </Card>
      </div>
    </Layout>
  )
}

export default OrdersOverTimeChart
