"use client";

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useProductOrders } from '@/src/hooks/useProductOrders';
import { useOrderActions } from '@/src/hooks/useOrderActions';
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
import { formatThaiCurrencyWithComma } from '@/lib/utils';
import { getStatusBadgeClasses } from '@/src/utils/orderDashboardUtils';
import { OrderStatus } from '@/types/supabaseTypes';
import Link from 'next/link';

// Status progression function
const getNextStatus = (currentStatus: OrderStatus): OrderStatus => {
  switch (currentStatus) {
    case 'new':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'delivery';
    case 'delivery':
      return 'completed';
    case 'completed':
      return 'paid';
    case 'paid':
    case 'cancelled':
    default:
      return currentStatus; // Do not change if already paid or cancelled, or unknown
  }
};

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

  const { updateOrderStatus } = useOrderActions();

  const getTitle = () => {
    let title = `Orders for ${productName}`;
    if (customerType === 'guest') {
      title += ' (Guests)';
    } else if (customerType === 'non-guest') {
      title += ' (Non-Guests)';
    }
    return title;
  };

  const handleStatusClick = (orderId: string, currentStatus: OrderStatus) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus !== currentStatus) {
      updateOrderStatus(orderId, nextStatus);
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
                    <TableHead>Order#</TableHead>
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
                        <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                          {String(order.id).slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {order.user_id ? (
                          <Link 
                            href={`/admin/customer-orders/${order.user_id}`} 
                            className="hover:underline text-primary"
                          >
                            {order.customer_name}
                          </Link>
                        ) : (
                          <span>{order.customer_name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), 'MMM d HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getStatusBadgeClasses(order.order_status)} cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => handleStatusClick(order.id, order.order_status as OrderStatus)}
                        >
                          {order.order_status === 'delivery' ? 'Delivery' : order.order_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatThaiCurrencyWithComma(order.total_amount)}
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
