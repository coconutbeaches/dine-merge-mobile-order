
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Order, OrderStatus, PaymentStatus, FulfillmentStatus } from '@/types/supabaseTypes';
import { useToast } from '@/hooks/use-toast';

const OrdersDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to fetch orders: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ order_status: status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, order_status: status } : order
      ));
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update order status: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updatePaymentStatus = async (orderId: number, status: PaymentStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, payment_status: status } : order
      ));
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update payment status: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateFulfillmentStatus = async (orderId: number, status: FulfillmentStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ fulfillment_status: status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Fulfillment status updated successfully",
      });
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, fulfillment_status: status } : order
      ));
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to update fulfillment status: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const deleteSelectedOrders = async () => {
    if (selectedOrders.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', selectedOrders);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${selectedOrders.length} orders deleted successfully`,
      });
      
      // Update local state
      setOrders(orders.filter(order => !selectedOrders.includes(order.id)));
      setSelectedOrders([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to delete orders: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const toggleSelectOrder = (orderId: number) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  const formatOrderNumber = (id: number) => {
    return `#${id.toString().padStart(4, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy HH:mm');
  };

  const formatCurrency = (amount: number) => {
    return `฿${amount.toFixed(2)}`;
  };

  return (
    <Layout title="Orders Dashboard" showBackButton={false}>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Orders Dashboard</h1>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              disabled={selectedOrders.length === 0}
              onClick={deleteSelectedOrders}
            >
              Delete Selected
            </Button>
            <Button onClick={fetchOrders} disabled={isLoading}>
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-muted">
            <div className="grid grid-cols-12 gap-4 font-semibold">
              <div className="col-span-1">
                <Checkbox 
                  checked={selectedOrders.length === orders.length && orders.length > 0} 
                  onCheckedChange={selectAllOrders}
                />
              </div>
              <div className="col-span-2">Order</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-1">Amount</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Payment</div>
              <div className="col-span-2">Fulfillment</div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-4 text-center">No orders found</div>
            ) : (
              <div>
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    className="grid grid-cols-12 gap-4 p-4 items-center border-b hover:bg-muted/30"
                  >
                    <div className="col-span-1">
                      <Checkbox 
                        checked={selectedOrders.includes(order.id)} 
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                      />
                    </div>
                    <div className="col-span-2 font-medium">{formatOrderNumber(order.id)}</div>
                    <div className="col-span-2">{order.customer_name || 'Anonymous'}</div>
                    <div className="col-span-1">{formatCurrency(order.total_amount)}</div>
                    <div className="col-span-2 text-sm text-muted-foreground">{formatDate(order.created_at)}</div>
                    
                    <div className="col-span-1">
                      <Select
                        defaultValue={order.order_status || 'pending'}
                        onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-1">
                      <Select
                        defaultValue={order.payment_status || 'unpaid'}
                        onValueChange={(value: PaymentStatus) => updatePaymentStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="confirming_payment">Confirming</SelectItem>
                          <SelectItem value="partially_paid">Partial</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="refunded">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="col-span-2">
                      <Select
                        defaultValue={order.fulfillment_status || 'unfulfilled'}
                        onValueChange={(value: FulfillmentStatus) => updateFulfillmentStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                          <SelectItem value="fulfilled">Fulfilled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default OrdersDashboard;
