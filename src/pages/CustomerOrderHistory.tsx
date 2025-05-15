import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatThaiCurrency } from '@/lib/utils';

const CustomerOrderHistory = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();

  // Fetch customer profile
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch customer orders
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'new': return "bg-red-500";
      case 'confirmed': return "bg-green-500";
      case 'make': return "bg-yellow-500";
      case 'ready': return "bg-orange-500";
      case 'delivered': return "bg-blue-500";
      case 'paid': return "bg-green-700";
      case 'cancelled': return "bg-gray-500";
      default: return "bg-gray-300";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd MMM yy HH:mm');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  if (customerLoading || ordersLoading) {
    return <Layout title="Customer History" showBackButton><div className="container mx-auto py-6">Loading...</div></Layout>;
  }

  if (!customer) {
    return <Layout title="Customer Not Found" showBackButton><div className="container mx-auto py-6">Customer not found</div></Layout>;
  }

  const totalSpent = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

  return (
    <Layout title={`Order History - ${customer.name || 'Customer'}`} showBackButton>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{customer.name || 'Customer'}</h2>
          <p className="text-muted-foreground">{customer.email}</p>
          {customer.phone && <p className="text-muted-foreground">{customer.phone}</p>}
          <div className="mt-4 p-4 bg-muted/20 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold">{formatThaiCurrency(totalSpent)}</p>
          </div>
        </div>

        <div className="space-y-4">
          {orders?.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">Order #{order.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(order.order_status)} text-white capitalize`}>
                    {order.order_status || 'Unknown'}
                  </Badge>
                </div>

                {order.order_items && (
                  <div className="mt-3 space-y-1">
                    {(typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items).map((item: any, idx: number) => (
                      <div key={idx} className="text-sm flex justify-between">
                        <span>{item.quantity}× {item.name}</span>
                        <span>{formatThaiCurrency(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t flex justify-between items-center font-semibold">
                  <span>Total</span>
                  <span>{formatThaiCurrency(order.total_amount)}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!orders || orders.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              No orders found for this customer.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CustomerOrderHistory;