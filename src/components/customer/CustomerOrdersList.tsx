
import React from 'react';
import { Order, OrderStatus } from '@/types/supabaseTypes';
import CustomerOrderCard from './CustomerOrderCard';

interface CustomerOrdersListProps {
  orders: Order[];
  onStatusClick: (orderId: string, newStatus: OrderStatus) => void;
  onOrderSave: (updatedOrder: Order) => void;
}

const CustomerOrdersList = ({ orders, onStatusClick, onOrderSave }: CustomerOrdersListProps) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg border-dashed">
        <h2 className="text-xl font-medium text-gray-500 mb-2">No Orders Found</h2>
        <p className="text-muted-foreground mb-6">This customer hasn't placed any orders yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <CustomerOrderCard key={`${order.id}-${order.updated_at}`} order={order} onStatusClick={onStatusClick} onOrderSave={onOrderSave} />
      ))}
    </div>
  );
};

export default CustomerOrdersList;
