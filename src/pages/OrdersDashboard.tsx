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
import { formatThaiCurrency } from '@/lib/utils';

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
      
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === orderId ? { ...order, order_status: status, updated_at: new Date().toISOString() } : order
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
      
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === orderId ? { ...order, payment_status: status, updated_at: new Date().toISOString() } : order
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
      
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === orderId ? { ...order, fulfillment_status: status, updated_at: new Date().toISOString() } : order
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
        description: `${selectedOrders.length} order(s) deleted successfully`,
      });
      
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
    setSelectedOrders(prevSelected => 
      prevSelected.includes(orderId) 
        ? prevSelected.filter(id => id !== orderId) 
        : [...prevSelected, orderId]
    );
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === orders.length && orders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  const formatOrderNumber = (id: number) => {
    return `#${id.toString().padStart(4, '0')}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy HH:mm');
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <Layout title="Orders Dashboard" showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">Orders Dashboard</h1>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="destructive" 
              disabled={selectedOrders.length === 0 || isLoading}
              onClick={deleteSelectedOrders}
            >
              Delete Selected ({selectedOrders.length})
            </Button>
            <Button onClick={fetchOrders} disabled={isLoading}>
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-muted/50 p-4">
            <div className="grid grid-cols-12 gap-x-2 md:gap-x-4 font-semibold text-sm">
              <div className="col-span-1 flex items-center">
                <Checkbox 
                  checked={selectedOrders.length === orders.length && orders.length > 0} 
                  onCheckedChange={selectAllOrders}
                  disabled={orders.length === 0}
                  aria-label="Select all orders"
                />
              </div>
              <div className="col-span-2">Order #</div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1">Payment</div>
              <div className="col-span-2">Fulfillment</div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No orders found.</div>
            ) : (
              <div>
                {orders.map((order) => (
                  <div 
                    key={order.id} 
                    className="grid grid-cols-12 gap-x-2 md:gap-x-4 p-4 items-center border-b last:border-b-0 hover:bg-muted/20 text-sm"
                  >
                    <div className="col-span-1 flex items-center">
                      <Checkbox 
                        checked={selectedOrders.includes(order.id)} 
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                        aria-label={`Select order ${formatOrderNumber(order.id)}`}
                      />
                    </div>
                    <div className="col-span-2 font-medium">{formatOrderNumber(order.id)}</div>
                    <div className="col-span-2 truncate" title={order.customer_name || 'Anonymous'}>{order.customer_name || 'Anonymous'}</div>
                    <div className="col-span-1 text-right">{formatThaiCurrency(order.total_amount)}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                    
                    <div className="col-span-1">
                      <Select
                        defaultValue={order.order_status || undefined}
                        onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue placeholder="Status" />
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
                        defaultValue={order.payment_status || undefined}
                        onValueChange={(value: PaymentStatus) => updatePaymentStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue placeholder="Payment" />
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
                        defaultValue={order.fulfillment_status || undefined}
                        onValueChange={(value: FulfillmentStatus) => updateFulfillmentStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue placeholder="Fulfillment" />
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
