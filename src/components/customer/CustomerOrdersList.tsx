
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Order } from '@/types/supabaseTypes';
import CustomerOrderCard from './CustomerOrderCard';

interface CustomerOrdersListProps {
  orders: Order[];
  onCreateNewOrder: () => void;
}

const CustomerOrdersList = ({ orders, onCreateNewOrder }: CustomerOrdersListProps) => {
  if (orders.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg border-dashed">
        <h2 className="text-xl font-medium text-gray-500 mb-2">No Orders Found</h2>
        <p className="text-muted-foreground mb-6">This customer hasn't placed any orders yet.</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={onCreateNewOrder} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create First Order
          </Button>
          <Link to="/orders-dashboard">
            <Button variant="outline">Back to Orders Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <CustomerOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};

export default CustomerOrdersList;
