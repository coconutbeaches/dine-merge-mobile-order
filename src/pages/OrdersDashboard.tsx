
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { useToast } from '@/hooks/use-toast';
import { formatThaiCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { New, Confirmed, CircleCheck, ChefHat, Clock, Truck, XCircle } from 'lucide-react';

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
  
  const getStatusBadge = (status: string) => {
    const badgeClasses = {
      new: "bg-red-100 text-red-800 border-red-200",
      confirmed: "bg-green-100 text-green-800 border-green-200",
      make: "bg-yellow-100 text-yellow-800 border-yellow-200",
      ready: "bg-orange-100 text-orange-800 border-orange-200",
      delivered: "bg-blue-100 text-blue-800 border-blue-200",
      paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200"
    };
    
    return `rounded-full px-2 py-1 text-xs font-medium border ${badgeClasses[status] || "bg-gray-100 text-gray-800 border-gray-200"}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <div className="h-4 w-4 text-red-600 mr-1">●</div>;
      case 'confirmed':
        return <div className="h-4 w-4 text-green-600 mr-1">●</div>;
      case 'make':
        return <div className="h-4 w-4 text-yellow-600 mr-1">●</div>;
      case 'ready':
        return <div className="h-4 w-4 text-orange-600 mr-1">●</div>;
      case 'delivered':
        return <div className="h-4 w-4 text-blue-600 mr-1">●</div>;
      case 'paid':
        return <div className="h-4 w-4 text-emerald-600 mr-1">●</div>;
      case 'cancelled':
        return <div className="h-4 w-4 text-gray-600 mr-1">●</div>;
      default:
        return <div className="h-4 w-4 text-gray-600 mr-1">●</div>;
    }
  };

  return (
    <Layout title="Orders Dashboard" showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-lg font-bold">Orders Dashboard</h1>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="destructive" 
              disabled={selectedOrders.length === 0 || isLoading}
              onClick={deleteSelectedOrders}
              size="sm"
            >
              Delete Selected ({selectedOrders.length})
            </Button>
            <Button onClick={fetchOrders} disabled={isLoading} size="sm">
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-muted/50 p-4">
            <div className="grid grid-cols-8 gap-x-2 md:gap-x-4 font-semibold text-sm">
              <div className="col-span-1 flex items-center">
                <Checkbox 
                  checked={selectedOrders.length === orders.length && orders.length > 0} 
                  onCheckedChange={selectAllOrders}
                  disabled={orders.length === 0}
                  aria-label="Select all orders"
                />
              </div>
              <div className="col-span-2">Customer</div>
              <div className="col-span-1 text-right">Amount</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Status</div>
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
                    className="grid grid-cols-8 gap-x-2 md:gap-x-4 p-4 items-center border-b last:border-b-0 hover:bg-muted/20 text-sm"
                  >
                    <div className="col-span-1 flex items-center">
                      <Checkbox 
                        checked={selectedOrders.includes(order.id)} 
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                        aria-label={`Select order ${formatOrderNumber(order.id)}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="font-medium truncate" title={order.customer_name || 'Anonymous'}>
                        {order.customer_name || 'Anonymous'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.table_number ? (
                          order.table_number === 'Take Away' ? 'Take Away' : `Table ${order.table_number}`
                        ) : 'No table'}
                      </div>
                    </div>
                    <div className="col-span-1 text-right">{formatThaiCurrency(order.total_amount)}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                    
                    <div className="col-span-2">
                      <Select
                        defaultValue={order.order_status || undefined}
                        onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-full h-9 text-xs flex items-center gap-1">
                          {order.order_status && (
                            <span className="flex items-center">
                              {getStatusIcon(order.order_status)}
                              <span className="capitalize">{order.order_status}</span>
                            </span>
                          )}
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new" className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-red-500 rounded-full" />
                            <span>New</span>
                          </SelectItem>
                          <SelectItem value="confirmed" className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-green-500 rounded-full" />
                            <span>Confirmed</span>
                          </SelectItem>
                          <SelectItem value="make" className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-yellow-500 rounded-full" />
                            <span>Make</span>
                          </SelectItem>
                          <SelectItem value="ready" className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-orange-500 rounded-full" />
                            <span>Ready</span>
                          </SelectItem>
                          <SelectItem value="delivered" className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-blue-500 rounded-full" />
                            <span>Delivered</span>
                          </SelectItem>
                          <SelectItem value="paid" className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-green-700 rounded-full" />
                            <span>Paid</span>
                          </SelectItem>
                          <SelectItem value="cancelled" className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-gray-500 rounded-full" />
                            <span>Cancelled</span>
                          </SelectItem>
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
