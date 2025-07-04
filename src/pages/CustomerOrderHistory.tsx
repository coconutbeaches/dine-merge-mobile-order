import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, DollarSign } from 'lucide-react';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { useOrderActions } from '@/hooks/useOrderActions';
import CustomerInfo from '@/components/customer/CustomerInfo';
import CustomerOrdersList from '@/components/customer/CustomerOrdersList';
import { toast } from 'sonner';
import { OrderStatus } from '@/types/supabaseTypes';

const CustomerOrderHistory = () => {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const { orders, setOrders, customer, isLoading } = useCustomerOrders(customerId);
  const { updateMultipleOrderStatuses, updateOrder } = useOrderActions(setOrders);

  const totalSpent = orders.reduce((total, order) => total + order.total_amount, 0);

  const handleCreateNewOrder = () => {
    // Navigate to menu with customer context
    router.push('/');
  };

  const handleMarkAllPaid = () => {
    if (!orders || orders.length === 0) return;
    const orderIdsToUpdate = orders
      .filter(order => order.order_status !== 'cancelled')
      .map(o => o.id);

    if (orderIdsToUpdate.length === 0) {
      toast.info("No orders to mark as paid.");
      return;
    }
    
    updateMultipleOrderStatuses(orderIdsToUpdate, 'paid');
  };

  const handleStatusClick = (orderId: string, newStatus: OrderStatus) => {
    updateMultipleOrderStatuses([orderId], newStatus);
  };

  const handleOrderSave = (updatedOrder: Order) => {
    updateOrder(updatedOrder);
  };

  if (isLoading) {
    return (
      <Layout title="Customer Orders" showBackButton={true}>
        <div className="page-container text-center py-10">
          <p>Loading customer orders...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Customer Orders: ${customer?.name || 'Unknown'}`} showBackButton={false}>
      <div className="page-container p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/orders-dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="bg-black text-white hover:bg-gray-800"
              size="icon"
              onClick={handleMarkAllPaid}
              disabled={orders.length === 0}
              aria-label="Mark all orders as paid"
            >
              <DollarSign className="h-4 w-4" />
              <span className="sr-only">Mark all as paid</span>
            </Button>
            <button 
              onClick={handleCreateNewOrder} 
              aria-label="New Order"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 w-10 hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {customer && (
          <CustomerInfo customer={customer} totalSpent={totalSpent} />
        )}
        
        <CustomerOrdersList orders={orders} onStatusClick={handleStatusClick} onOrderSave={handleOrderSave} />
      </div>
    </Layout>
  );
};

export default CustomerOrderHistory;
