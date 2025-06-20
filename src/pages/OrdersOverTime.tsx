import React from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useOrdersByDate } from '@/hooks/useOrdersByDate';
import { format, subDays } from 'date-fns';

const OrdersOverTime = () => {
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const { data, isLoading, error } = useOrdersByDate(startDate, endDate, 'count');

  const chartData = data.map((row) => ({
    date: row.order_date,
    hotel_guest: row.hotel_guest_orders,
    outside_guest: row.outside_guest_orders,
  }));

  return (
    <Layout title="Orders Over Time" showBackButton>
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Orders Over Time</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading analytics...</div>
            ) : error ? (
              <div className="p-6 text-center text-destructive">Failed to load data</div>
            ) : (
              <ChartContainer
                config={{
                  hotel_guest: { label: 'Hotel Guest', color: 'hsl(var(--primary))' },
                  outside_guest: { label: 'Outside Guest', color: 'hsl(var(--secondary))' },
                }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="hotel_guest" stackId="orders" fill="var(--color-hotel_guest)" />
                    <Bar dataKey="outside_guest" stackId="orders" fill="var(--color-outside_guest)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OrdersOverTime;
