import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, DollarSign } from 'lucide-react';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';
import { useOrderActions } from '@/hooks/useOrderActions';
import CustomerInfo from '@/components/customer/CustomerInfo';
import CustomerOrdersList from '@/components/customer/CustomerOrdersList';
import { toast } from 'sonner';

const CustomerOrderHistory = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const { orders, setOrders, customer, isLoading } = useCustomerOrders(customerId);
  const { updateMultipleOrderStatuses } = useOrderActions(setOrders);

  const totalSpent = orders.reduce((total, order) => total + order.total_amount, 0);

  const handleCreateNewOrder = () => {
    // Navigate to menu with customer context
    navigate('/menu', { 
      state: { 
        adminCustomerId: customerId,
        adminCustomerName: customer?.name || customer?.email 
      } 
    });
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
            <Link to="/orders-dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">
              {customer ? `${customer.name || 'Customer'}'s Orders` : 'Customer Orders'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="icon"
              onClick={handleMarkAllPaid}
              disabled={orders.length === 0}
              aria-label="Mark all orders as paid"
            >
              <DollarSign className="h-4 w-4" />
              <span className="sr-only">Mark all as paid</span>
            </Button>
            <Button onClick={handleCreateNewOrder} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {customer && (
          <CustomerInfo customer={customer} totalSpent={totalSpent} />
        )}
        
        <CustomerOrdersList orders={orders} />
      </div>
    </Layout>
  );
};

export default CustomerOrderHistory;
