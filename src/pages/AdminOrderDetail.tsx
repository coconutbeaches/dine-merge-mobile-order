
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useFetchOrderById } from '@/hooks/useFetchOrderById';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatThaiCurrency } from '@/lib/utils';
import { formatOrderDateTime, getStatusBadgeClasses } from '@/utils/orderDashboardUtils';
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
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <Skeleton className="h-7 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <div className="space-y-2 mb-4">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
              <Separator />
              <div className="mt-4 flex justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
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
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">Order #{String(order.id).padStart(4, '0')}</h2>
                <p className="text-sm text-muted-foreground">{formatOrderDateTime(order.created_at)}</p>
                {order.table_number && <p className="text-sm text-muted-foreground">Table {order.table_number}</p>}
              </div>
              <div className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeClasses(order.order_status)}`}>
                <span className="capitalize">{order.order_status}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {order.order_items?.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <p>{item.quantity}x {item.name || 'Unknown Product'}</p>
                  <p className="font-medium">
                    {formatThaiCurrency((item.price || 0) * item.quantity)}
                  </p>
                </div>
              ))}
              {(!order.order_items || order.order_items.length === 0) && (
                <p className="text-muted-foreground">No items in this order.</p>
              )}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <p className="text-lg font-bold">Total</p>
              <p className="text-lg font-bold">{formatThaiCurrency(order.total_amount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminOrderDetail;
