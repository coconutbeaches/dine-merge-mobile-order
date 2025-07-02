import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';
import OrderEditDialog from '../customer/OrderEditDialog';

interface OrderItem {
  product?: string;
  name?: string;
  menuItem?: { name: string; price: number };
  price: number;
  quantity: number;
  selectedOptions?: Record<string, string[] | string>;
}

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

interface EditableOrderCardProps {
  order: Order;
  onStatusClick: (orderId: string, newStatus: OrderStatus) => void;
  onOrderSave: (updatedOrder: Order) => void;
  onClose: () => void;
}

const EditableOrderCard = ({ order, onStatusClick, onOrderSave, onClose }: EditableOrderCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleBadgeClick = () => {
    if (order.order_status) {
      const nextStatus = getNextStatus(order.order_status);
      if (nextStatus !== order.order_status) {
        onStatusClick(order.id, nextStatus);
      }
    }
  };

  const handleOrderNumberClick = () => {
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
  };

  const handleEditDialogSave = (updatedOrder: Order) => {
    onOrderSave(updatedOrder);
  };

  return (
    <Card className="overflow-hidden food-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold cursor-pointer" onClick={handleOrderNumberClick}>Order #{order.id.toString().padStart(4, '0')}</h3>
            <p className="text-xs text-muted-foreground">
              {format(new Date(order.created_at), "MMM dd yyyy  h:mm a")}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {order.table_number && order.table_number !== 'Take Away'
                ? `Table ${order.table_number}`
                : 'Take Away'}
            </p>
          </div>
          {order.order_status && (
            <Badge
              className={`${getStatusColor(order.order_status)} text-white capitalize cursor-pointer`}
              onClick={handleBadgeClick}
            >
              {order.order_status === 'delivery' ? 'Delivery' : order.order_status}
            </Badge>
          )}
        </div>
        <div className="mt-3 mb-3">
          {Array.isArray(order.order_items) && order.order_items.map((item: OrderItem, idx: number) => {
            const name = item.product || item.name || (item.menuItem && item.menuItem.name) || "Item";
            const price = (typeof item.price === "number"
              ? item.price
              : item.menuItem && typeof item.menuItem.price === "number"
                ? item.menuItem.price
                : 0);
            const selectedOptions = item.selectedOptions;

            return (
              <div key={idx} className="text-sm mb-1">
                <div className="flex justify-between pr-2">
                  <span>
                    {item.quantity}× {name}
                  </span>
                  <span>{formatThaiCurrency(price * item.quantity)}</span>
                </div>

                {selectedOptions && Object.keys(selectedOptions).length > 0 && (
                  <div className="pl-5 text-xs text-muted-foreground">
                    {Object.values(selectedOptions)
                      .flat()
                      .filter(Boolean)
                      .map((value: string | string[], i: number) => (
                        <div key={i}>{String(value)}</div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center font-semibold">
          <span>Total</span>
          <span>{formatThaiCurrency(order.total_amount)}</span>
        </div>
      </CardContent>
      {isEditDialogOpen && (
        <OrderEditDialog
          order={order}
          isOpen={isEditDialogOpen}
          onClose={handleEditDialogClose}
          onSave={handleEditDialogSave}
        />
      )}
    </Card>
  );
};

export default EditableOrderCard;
