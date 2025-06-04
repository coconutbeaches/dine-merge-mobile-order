import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Edit3, FilePenLine } from 'lucide-react';
import { useUserContext } from '@/context/UserContext';
// import { toast } from 'sonner'; // Not currently used in this version for "No customer ID"

const CustomerOrderHistory = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const { currentUser, isLoading: isUserContextLoading } = useUserContext();

  useEffect(() => {
    if (customerId) {
      setPageIsLoading(true);
      setCustomer(null);
      setOrders([]);

      Promise.all([
        fetchCustomerDetails(customerId),
        fetchCustomerOrders(customerId)
      ]).finally(() => {
        setPageIsLoading(false);
      });
      
      const channel = supabase
        .channel(`customer-orders-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${customerId}` },
          (payload) => {
            fetchCustomerOrders(customerId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setPageIsLoading(false);
      setCustomer(null);
      setOrders([]);
    }
  }, [customerId]);

  const fetchCustomerDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        throw error;
      }
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      setCustomer(null);
    }
  };

  const fetchCustomerOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      if (data) {
        const transformedOrders = data.map(order => {
          let appOrderStatus: OrderStatus;
          if (order.payment_status === 'paid') {
            appOrderStatus = 'paid';
          } else if (order.order_status) {
            appOrderStatus = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          } else {
            appOrderStatus = 'new';
          }
          return { ...order, order_status: appOrderStatus } as Order;
        });
        setOrders(transformedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      setOrders([]);
    }
  };

  // CORRECTED getStatusColor function
  const getStatusColor = (status: OrderStatus | null) => {
    switch (status) { // Restored switch statement
      case 'new': return "bg-red-500";
      case 'confirmed': return "bg-green-500";
      case 'make': return "bg-yellow-500";
      case 'ready': return "bg-orange-500";
      case 'delivered': return "bg-blue-500";
      case 'paid': return "bg-green-700";
      case 'cancelled': return "bg-gray-500";
      default: return "bg-gray-400";
    } // Closing brace for switch
  };

  const totalSpent = orders.reduce((total, order) => total + (order.total_amount || 0), 0);

  if (pageIsLoading || isUserContextLoading) {
    return (
      <Layout title="Customer Orders" showBackButton={true}>
        <div className="page-container text-center py-10">
          <p>Loading data...</p>
        </div>
      </Layout>
    );
  }

  const pageTitle = `Customer Orders: ${customer?.name || (customerId ? 'Unknown Customer' : 'N/A')}`;

  return (
    <Layout title={pageTitle} showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link to="/orders-dashboard">
              <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-xl font-bold">
              {customer ? `${customer.name || 'Customer'}'s Orders` : (customerId ? `Orders for ID: ${customerId.substring(0,8)}...` : 'Customer Orders')}
            </h1>
          </div>
          {currentUser?.role === 'admin' && customerId && customer && (
            <Link to={`/admin/edit-customer/${customerId}`}>
              <Button variant="outline" size="sm"><Edit3 className="h-4 w-4 mr-2" />Edit Customer</Button>
            </Link>
          )}
        </div>

        {customer && (
          <Card className="mb-6 bg-muted/20">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
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
        
        {!customerId && !pageIsLoading && !isUserContextLoading && (
            <div className="text-center py-10 border rounded-lg border-dashed">
                <h2 className="text-xl font-medium text-gray-500 mb-2">Invalid Customer ID</h2>
                <p className="text-muted-foreground mb-6">No customer ID was specified or it was invalid.</p>
                <Link to="/orders-dashboard"><Button>Back to Orders Dashboard</Button></Link>
            </div>
        )}

        {customerId && (orders.length === 0 ? (
          <div className="text-center py-10 border rounded-lg border-dashed">
            <h2 className="text-xl font-medium text-gray-500 mb-2">No Orders Found</h2>
            <p className="text-muted-foreground mb-6">
              {customer ? "This customer hasn't placed any orders yet." : (customerId ? "No orders found for this customer ID, or customer details could not be loaded." : "Cannot load orders without a customer ID.")}
            </p>
            <Link to="/orders-dashboard"><Button>Back to Orders Dashboard</Button></Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
                  <div>
                    <CardTitle className="text-lg font-semibold">Order #{order.id.toString().padStart(4, '0')}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, yyyy - h:mm a')}
                    </p>
                  </div>
                  {currentUser?.role === 'admin' && (
                    <Link to={`/admin/edit-order/${order.id}`}>
                      <Button variant="outline" size="sm"><FilePenLine className="h-4 w-4 mr-1 md:mr-2" />Edit Order</Button>
                    </Link>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                   <div className="flex flex-col md:flex-row justify-between md:items-start gap-3 mb-3">
                    <div>
                      {order.order_status && (
                        <Badge className={`${getStatusColor(order.order_status)} text-white capitalize mb-1`}>
                          {order.order_status}
                        </Badge>
                      )}
                      {order.table_number && (
                        <p className="text-sm text-muted-foreground capitalize">
                          {order.table_number === 'Take Away' ? 'Take Away' : `Table: ${order.table_number}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-lg">{formatThaiCurrency(order.total_amount)}</span>
                    </div>
                  </div>
                  
                  {order.order_items && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-sm border-t border-gray-100 pt-2">
                      {Array.isArray(order.order_items) ?
                        order.order_items
                          .filter(item => item && typeof item === 'object')
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
        ))}
      </div>
    </Layout>
  );
};

export default CustomerOrderHistory;
