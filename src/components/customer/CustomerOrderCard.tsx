
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';

// Helper: get status color (copied from OrderHistory)
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

// Helper: Clean options formatting (identical to OrderHistory)
const getCleanOptionsString = (selectedOptions: any) => {
  if (!selectedOptions || typeof selectedOptions !== "object") return "";
  const allChosen = Object.values(selectedOptions)
    .flat()
    .map(c => String(c))
    .filter(Boolean);
  if (allChosen.length === 0) return "";
  // Two spaces before options
  return `  ${allChosen.join(", ")}`;
};

interface CustomerOrderCardProps {
  order: Order;
}

const CustomerOrderCard = ({ order }: CustomerOrderCardProps) => {
  return (
    <Card className="overflow-hidden food-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold">Order #{order.id.toString().padStart(4, '0')}</h3>
            <p className="text-xs text-muted-foreground">
              {/* Format: Jun 14 2025  8:39 PM */}
              {format(new Date(order.created_at), "MMM dd yyyy  h:mm a")}
            </p>
            {order.table_number && (
              <p className="text-xs text-muted-foreground capitalize">
                {order.table_number === 'Take Away'
                  ? 'Take Away'
                  : `Table ${order.table_number}`}
              </p>
            )}
          </div>
          {order.order_status && (
            <Badge className={`${getStatusColor(order.order_status)} text-white capitalize`}>
              {order.order_status === 'delivery' ? 'Delivery' : order.order_status}
            </Badge>
          )}
        </div>
        <div className="mt-3 mb-3 max-h-24 overflow-y-auto">
          {Array.isArray(order.order_items) && order.order_items.map((item: any, idx: number) => {
            const name = item.name || (item.menuItem && item.menuItem.name) || "Item";
            const price = (typeof item.price === "number"
              ? item.price
              : item.menuItem && typeof item.menuItem.price === "number"
                ? item.menuItem.price
                : 0);
            const selectedOptions = item.selectedOptions;
            const optionString = getCleanOptionsString(selectedOptions);

            return (
              <div key={idx} className="text-sm pr-2 mb-1 flex justify-between">
                <span>
                  {item.quantity}× {name}
                  {optionString &&
                    <span className="text-xs text-muted-foreground font-normal not-italic">
                      {optionString}
                    </span>
                  }
                </span>
                <span>{formatThaiCurrency(price * item.quantity)}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center font-semibold">
          <span>Total</span>
          <span>{formatThaiCurrency(order.total_amount)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerOrderCard;

