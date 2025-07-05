"use client";

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useProductOrders } from '@/src/hooks/useProductOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { formatThaiCurrency } from '@/lib/utils';
import Link from 'next/link';

const ProductOrdersPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const productId = params.productId as string;
  const customerType = searchParams?.get('customerType');
  const startDate = searchParams?.get('startDate');
  const endDate = searchParams?.get('endDate');

  const { orders, isLoading, productName } = useProductOrders(
    productId,
    customerType,
    startDate,
    endDate
  );

  const getTitle = () => {
    let title = `Orders for ${productName}`;
    if (customerType === 'guest') {
      title += ' (Guests)';
    } else if (customerType === 'non-guest') {
      title += ' (Non-Guests)';
    }
    return title;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout title={getTitle()} showBackButton>
      <div className="page-container p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {isLoading ? 'Loading Orders...' : getTitle()}
            </CardTitle>
            {startDate && endDate && (
              <p className="text-sm text-muted-foreground">
                From {format(new Date(startDate), 'dd MMM yyyy')} to {format(new Date(endDate), 'dd MMM yyyy')}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No orders found for this product.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link href={`/admin/orders/${order.id}`} className="underline hover:no-underline">
                          {String(order.id).slice(0, 8)}...
                        </Link>
                      </TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeClass(order.order_status)}>
                          {order.order_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatThaiCurrency(order.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ProductOrdersPage;
