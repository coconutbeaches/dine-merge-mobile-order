
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { 
  Order, 
  OrderStatus, 
  Profile, 
  SupabaseOrderStatus,
  mapSupabaseToOrderStatus 
} from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

const CustomerOrderHistory = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (customerId) {
      Promise.all([
        fetchCustomerDetails(customerId),
        fetchCustomerOrders(customerId)
      ]).finally(() => setIsLoading(false));
      
      // Setup real-time subscription for this customer's orders
      const channel = supabase
        .channel(`customer-orders-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${customerId}` },
          (payload) => {
            console.log("Real-time order update:", payload);
            fetchCustomerOrders(customerId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [customerId]);

  const fetchCustomerDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) throw error;
      console.log("Customer details:", data);
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const fetchCustomerOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      console.log("Customer orders raw data:", data);
      
      if (data) {
        // Transform the data to correctly handle the order_status
        const transformedOrders = data.map(order => {
          let appOrderStatus: OrderStatus;
          
          // Special handling for 'paid' orders
          if (order.payment_status === 'paid') {
            appOrderStatus = 'paid';
          } else if (order.order_status) {
            // Map Supabase order_status to our application OrderStatus
            appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          } else {
            // Default fallback
            console.warn(`Order ${order.id} - order_status from DB is null or empty. Defaulting to 'new'. DB value: `, order.order_status);
            appOrderStatus = 'new';
          }
          
          console.log(`Order ${order.id} - DB order_status: ${order.order_status}, DB payment_status: ${order.payment_status}, Calculated app_status: ${appOrderStatus}`);
          
          return {
            ...order,
            order_status: appOrderStatus
          } as Order;
        });
        
        console.log("Transformed orders:", transformedOrders);
        setOrders(transformedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setOrders([]);
    }
  };

  const getStatusColor = (status: OrderStatus | null) => {
    switch (status) {
      case 'new':
        return "bg-red-500";
      case 'confirmed':
        return "bg-green-500";
      case 'make':
        return "bg-yellow-500";
      case 'ready':
        return "bg-orange-500";
      case 'delivered':
        return "bg-blue-500";
      case 'paid':
        return "bg-green-700";
      case 'cancelled':
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const totalSpent = orders.reduce((total, order) => total + order.total_amount, 0);

  if (isLoading) {
    return (
      <Layout title="Customer Orders" showBackButton={true}>
        <div className="page-container text-center py-10">
          <p>Loading customer orders...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Customer Orders: ${customer?.name || 'Unknown'}`} showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex items-center mb-6 gap-4">
          <Link to="/orders-dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">
            {customer ? `${customer.name || 'Customer'}'s Orders` : 'Customer Orders'}
          </h1>
        </div>

        {customer && (
          <Card className="mb-6 bg-muted/20">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{customer.name}</h2>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                  {customer.phone && <p className="text-sm">{customer.phone}</p>}
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold">{formatThaiCurrency(totalSpent)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {orders.length === 0 ? (
          <div className="text-center py-10 border rounded-lg border-dashed">
            <h2 className="text-xl font-medium text-gray-500 mb-2">No Orders Found</h2>
            <p className="text-muted-foreground mb-6">This customer hasn't placed any orders yet.</p>
            <Link to="/orders-dashboard">
              <Button>Back to Orders Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">Order #{order.id.toString().padStart(4, '0')}</h3>
                        {order.order_status && (
                          <Badge className={`${getStatusColor(order.order_status)} text-white capitalize`}>
                            {order.order_status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy - h:mm a')}
                      </p>
                      {order.table_number && (
                        <p className="text-xs text-muted-foreground capitalize mt-1">
                          {order.table_number === 'Take Away' ? 'Take Away' : `Table: ${order.table_number}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatThaiCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                  
                  {order.order_items && (
                    <div className="mt-3 mb-2 max-h-32 overflow-y-auto text-sm border-t border-gray-100 pt-2">
                      {Array.isArray(order.order_items) ?
                        order.order_items
                          .filter(item => item && typeof item === 'object') // Filter out null/undefined/non-object items
                          .map((item: any, idx: number) => {
                            const itemName = typeof item.name === 'string' ? item.name : 'Unknown Item';
                            const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
                            const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;

                            return (
                              <div key={idx} className="flex justify-between mb-1 pr-2">
                                <span>{quantity}× {itemName}</span>
                                {(typeof item.quantity === 'number' && typeof item.unitPrice === 'number') ? (
                                  <span>{formatThaiCurrency(unitPrice * quantity)}</span>
                                ) : (
                                  <span>Price not available</span>
                                )}
                              </div>
                            );
                          })
                       : (
                        <p className="text-sm text-muted-foreground">Order details not available</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CustomerOrderHistory;
