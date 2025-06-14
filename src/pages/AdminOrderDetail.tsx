
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useFetchOrderById } from '@/hooks/useFetchOrderById';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatThaiCurrency } from '@/lib/utils';
import { formatOrderDate, formatOrderTime, getStatusColorDot } from '@/utils/orderDashboardUtils';
import { Separator } from '@/components/ui/separator';

const AdminOrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, isLoading, error } = useFetchOrderById(orderId);

  if (isLoading) {
    return (
      <Layout title="Order Details" showBackButton={false}>
        <div className="page-container p-4 md:p-6">
          <div className="flex items-center gap-4 mb-6">
            <Link to="/orders-dashboard">
              <Button variant="outline" size="icon" disabled>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Skeleton className="h-8 w-48" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout title="Error" showBackButton={true}>
        <div className="page-container p-4 md:p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-red-500 mb-6">
            {error ? `Failed to load order: ${error.message}` : "The requested order could not be found."}
          </p>
          <Link to="/orders-dashboard">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders Dashboard
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const customerDisplayName = order.customer_name_from_profile || order.customer_name || 'Guest';

  return (
    <Layout title={`Order #${order.id}`} showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/orders-dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Order Details</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order #{order.id}</CardTitle>
            <CardDescription>
              Placed on {formatOrderDate(order.created_at)} at {formatOrderTime(order.created_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <p><strong>Name:</strong> {customerDisplayName}</p>
                <p><strong>Email:</strong> {order.customer_email_from_profile || 'N/A'}</p>
                <p><strong>Table/Takeaway:</strong> {order.table_number || 'N/A'}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Order Status</h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-3 h-3 rounded-full ${getStatusColorDot(order.order_status)}`}></span>
                  <span className="capitalize font-medium">{order.order_status}</span>
                </div>
              </div>
            </div>

            <Separator />
            
            <div>
              <h3 className="font-semibold mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.order_items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.products?.name || 'Unknown Product'}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <p className="font-medium">
                      {formatThaiCurrency((item.products?.price || 0) * item.quantity)}
                    </p>
                  </div>
                ))}
                {(!order.order_items || order.order_items.length === 0) && (
                  <p className="text-muted-foreground">No items in this order.</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 p-6 flex justify-end">
            <div className="text-right">
              <p className="text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatThaiCurrency(order.total_amount)}</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminOrderDetail;
