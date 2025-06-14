import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { OrderStatus } from '@/types/supabaseTypes';
import { formatThaiCurrency } from '@/lib/utils';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { getOrderHistory, isLoggedIn, isLoading, currentUser } = useAppContext();
  
  React.useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate('/login', { state: { returnTo: '/order-history' } });
    }
  }, [isLoggedIn, navigate, isLoading]);
  
  // The getOrderHistory from context already filters by user and sorts.
  const orders = getOrderHistory();
  
  // Only count non-cancelled orders in the spent total
  const totalSpent = orders
    .filter(order => order.order_status !== 'cancelled')
    .reduce((total, order) => total + (order.total_amount || 0), 0);
  
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
        return "bg-green-700"; // Darker green for Paid
      case 'cancelled':
        return "bg-gray-500";
      default:
        return "bg-gray-400"; // Default for null or unknown
    }
  };

  // Utility function to display selected options inline, in parentheses
  const renderSelectedOptionsInline = (selectedOptions: any) => {
    if (!selectedOptions || typeof selectedOptions !== "object") return null;
    const entries = Object.entries(selectedOptions);
    if (entries.length === 0) return null;
    // Format: Option1: Choice1, Option2: Choice2, etc. (all in one string, comma separated)
    const optionsStr = entries
      .map(([option, choice]) => {
        if (Array.isArray(choice)) {
          return `${option}: ${choice.join(", ")}`;
        } else {
          return `${option}: ${typeof choice === "string" ? choice : String(choice)}`;
        }
      })
      .join(", ");
    return ` (${optionsStr})`;
  };

  if (isLoading) {
    return (
      <Layout title="Order History" showBackButton>
        <div className="page-container text-center py-10">
          <p>Loading order history...</p>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout title="Order History" showBackButton>
      <div className="page-container">
        {orders.length > 0 && (
          <div className="bg-muted/20 p-4 rounded-lg mb-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Spent on Orders</p>
            <p className="text-2xl font-bold">{formatThaiCurrency(totalSpent)}</p>
          </div>
        )}
        
        {orders.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-bold mb-2">No Orders Yet</h2>
            <p className="text-muted-foreground mb-6">You haven't placed any orders yet.</p>
            <Button onClick={() => navigate('/menu')}>Browse Menu</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="food-card overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">Order #{order.id.toString().padStart(4, '0')}</h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy - h:mm a')}
                      </p>
                      {order.table_number && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.table_number === 'Take Away' ? 'Take Away' : `Table: ${order.table_number}`}
                        </p>
                      )}
                    </div>
                    {order.order_status && (
                       <Badge className={`${getStatusColor(order.order_status)} text-white capitalize`}>
                         {order.order_status === 'delivery' ? 'Delivery' : order.order_status}
                       </Badge>
                    )}
                  </div>
                  
                  {/* FIXED order items display */}
                  <div className="mt-3 mb-3 max-h-24 overflow-y-auto">
                    {Array.isArray(order.order_items) && order.order_items.map((item: any, idx: number) => {
                      // Support both shapes: {quantity, name, price, selectedOptions} or {quantity, menuItem: {name, price}, selectedOptions}
                      const name = item.name || (item.menuItem && item.menuItem.name) || "Item";
                      const price = (typeof item.price === "number"
                        ? item.price
                        : item.menuItem && typeof item.menuItem.price === "number"
                          ? item.menuItem.price
                          : 0);
                      const selectedOptions = item.selectedOptions;

                      return (
                        <div key={idx} className="text-sm pr-2 mb-1 flex justify-between">
                          <span>
                            {item.quantity}× {name}
                            {selectedOptions && renderSelectedOptionsInline(selectedOptions)}
                          </span>
                          <span>{formatThaiCurrency(price * item.quantity)}</span>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span>{formatThaiCurrency(order.total_amount)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrderHistory;
