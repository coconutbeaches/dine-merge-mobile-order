

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';

interface CustomerOrderCardProps {
  order: Order;
}

const CustomerOrderCard = ({ order }: CustomerOrderCardProps) => {
  const getStatusColor = (status: OrderStatus | null) => {
    switch (status) {
      case 'new':
        return "bg-red-500";
      case 'preparing':
        return "bg-yellow-500";
      case 'ready':
        return "bg-orange-500";
      case 'delivery':
        return "bg-blue-500";
      case 'completed':
        return "bg-green-500";
      case 'paid':
        return "bg-green-700";
      case 'cancelled':
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">Order #{order.id.toString().padStart(4, '0')}</h3>
              {order.order_status && (
                <Badge className={`${getStatusColor(order.order_status)} text-white capitalize`}>
                  {order.order_status === 'delivery'
                    ? 'Delivery'
                    : order.order_status === 'paid'
                    ? 'Paid'
                    : order.order_status}
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
            {Array.isArray(order.order_items) ? order.order_items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between mb-1 pr-2">
                <span>{item.quantity}× {item.name}</span>
                <span>{formatThaiCurrency(item.price * item.quantity)}</span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">Order details not available</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerOrderCard;

