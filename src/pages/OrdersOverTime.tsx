import React, { useState } from 'react';
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
import { format, subDays, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  created_at: string;
  customer_name?: string;
  customer_type?: string;
}

const OrdersOverTime = () => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const endDate = format(new Date(), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const { data, isLoading, error } = useOrdersByDate(startDate, endDate, 'count');

  const handleBarClick = async (data: any, index: number) => {
    const clickedDate = data.activePayload?.[0]?.payload?.date;
    if (!clickedDate) return;

    setSelectedDate(clickedDate);
    setIsLoadingOrders(true);
    setIsDialogOpen(true);

    try {
      const startOfDay = new Date(clickedDate);
      const endOfDay = new Date(clickedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // First, get the order counts to verify
      const { data: orderCounts, error: countError } = await supabase
        .from('orders')
        .select('id, created_at, order_status, profiles(customer_type)')
        .eq('order_status', 'completed')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      if (countError) throw countError;

      console.log('Order counts by type:', {
        hotel_guest: orderCounts.filter(o => o.profiles?.customer_type === 'hotel_guest').length,
        outside_guest: orderCounts.filter(o => o.profiles?.customer_type !== 'hotel_guest').length,
        total: orderCounts.length
      });

      // Then fetch the full order details
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          created_at,
          profiles!left(
            id,
            full_name,
            customer_type
          )
        `)
        .eq('order_status', 'completed')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      console.log('Fetched orders:', ordersData);

      const formattedOrders = ordersData.map(order => ({
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        created_at: order.created_at,
        customer_name: order.profiles?.full_name || 'Guest',
        customer_type: order.profiles?.customer_type === 'hotel_guest' ? 'Hotel Guest' : 'Outside Guest'
      }));

      console.log('Formatted orders:', formattedOrders);
      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const chartData = data?.map((row) => ({
    date: row.order_date,
    hotel_guest: row.hotel_guest_orders,
    outside_guest: row.outside_guest_orders,
  })) || [];

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
                <div onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Legend content={<ChartLegendContent />} />
                      <Bar 
                        dataKey="hotel_guest" 
                        stackId="orders" 
                        fill="var(--color-hotel_guest)" 
                        name="Hotel Guest"
                      />
                      <Bar 
                        dataKey="outside_guest" 
                        stackId="orders" 
                        fill="var(--color-outside_guest)" 
                        name="Outside Guest"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Orders for {selectedDate ? format(parseISO(selectedDate), 'MMMM d, yyyy') : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {isLoadingOrders ? (
                <div className="p-6 text-center">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No orders found for this date</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 font-medium">
                    <div>Order #</div>
                    <div>Customer</div>
                    <div>Type</div>
                    <div className="text-right">Amount</div>
                  </div>
                  {orders.map((order) => (
                    <div key={order.id} className="grid grid-cols-4 gap-4 py-2 border-t">
                      <div>#{order.order_number}</div>
                      <div>{order.customer_name}</div>
                      <div>{order.customer_type}</div>
                      <div className="text-right">${order.total_amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default OrdersOverTime;