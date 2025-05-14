import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Order as SupabaseOrder, OrderStatus as SupabaseOrderStatus } from '@/types/supabaseTypes';
import { useToast } from '@/hooks/use-toast';
import { formatThaiCurrency } from '@/lib/utils';

type Order = SupabaseOrder;

const OrdersDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    // Setup real-time subscription for orders
    const channel = supabase
      .channel('custom-orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Change received!', payload);
          // Re-fetch orders to get the latest state
          // More sophisticated updates (new, update, delete) can be handled here
          // For simplicity, just re-fetching now.
          fetchOrders(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const updateOrderStatus = async (orderId: number, status: SupabaseOrderStatus) => {
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
      // Optimistic update or rely on real-time / re-fetch
      // setOrders(prevOrders => prevOrders.map(order => 
      //   order.id === orderId ? { ...order, order_status: status, updated_at: new Date().toISOString() } : order
      // ));
      // Real-time subscription should handle the update, or call fetchOrders() if not using real-time for this.
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yy HH:mm'); // Shorter date format
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  const getStatusColorDot = (status: string | null) => {
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
  
  // Define the order statuses for the dropdown
  const orderStatusOptions: SupabaseOrderStatus[] = ['new', 'confirmed', 'make', 'ready', 'delivered', 'paid', 'cancelled'];

  return (
    <Layout title="Orders Dashboard" showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-xl font-bold">Orders Dashboard</h1> {/* Increased font size slightly */}
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
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-muted/50 p-3"> {/* Reduced padding slightly */}
            {/* Adjusted grid for new layout: Checkbox, Customer, Table, Amount, Date, Status */}
            <div className="grid grid-cols-12 gap-x-2 md:gap-x-3 font-semibold text-sm">
              <div className="col-span-1 flex items-center">
                <Checkbox 
                  checked={selectedOrders.length === orders.length && orders.length > 0 && orders.length > 0} 
                  onCheckedChange={selectAllOrders}
                  disabled={orders.length === 0}
                  aria-label="Select all orders"
                />
              </div>
              <div className="col-span-3">Customer</div> {/* Increased span for customer */}
              <div className="col-span-2">Table/Type</div>
              <div className="col-span-2 text-right">Amount</div> {/* Amount before Date */}
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
                    className="grid grid-cols-12 gap-x-2 md:gap-x-3 p-3 items-center border-b last:border-b-0 hover:bg-muted/20 text-sm"
                  >
                    <div className="col-span-1 flex items-center">
                      <Checkbox 
                        checked={selectedOrders.includes(order.id)} 
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                        aria-label={`Select order ${order.id}`}
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="font-medium truncate" title={order.customer_name || 'Anonymous'}>
                        {order.customer_name || `Order #${order.id}`} {/* Show order id if no name */}
                      </div>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground capitalize">
                      {(order as any).table_number ? ((order as any).table_number === 'Take Away' ? 'Take Away' : `Table ${(order as any).table_number}`) : 'N/A'}
                    </div>
                    <div className="col-span-2 text-right">{formatThaiCurrency(order.total_amount)}</div>
                    <div className="col-span-2 text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                    
                    <div className="col-span-2">
                      <Select
                        value={order.order_status || undefined} // Use value instead of defaultValue for controlled component if status can change
                        onValueChange={(value: SupabaseOrderStatus) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger className="w-full h-9 text-xs flex items-center gap-1.5 py-1">
                           {order.order_status && (
                            <>
                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${getStatusColorDot(order.order_status)}`}></span>
                              <span className="capitalize">{order.order_status}</span>
                            </>
                           )}
                           {!order.order_status && <span className="text-muted-foreground">Select...</span>}
                        </SelectTrigger>
                        <SelectContent>
                          {orderStatusOptions.map(statusVal => (
                            <SelectItem key={statusVal} value={statusVal} className="flex items-center gap-2 text-xs capitalize">
                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${getStatusColorDot(statusVal)}`}></span>
                              {statusVal}
                            </SelectItem>
                          ))}
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
