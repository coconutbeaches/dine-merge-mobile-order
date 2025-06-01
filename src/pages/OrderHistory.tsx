
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { OrderStatus } from '@/types/supabaseTypes'; // Import from supabaseTypes
import { formatThaiCurrency } from '@/lib/utils';

const OrderHistory = () => {
  const navigate = useNavigate();
  // Added isOrdersLoading from useAppContext
  const { getOrderHistory, isLoggedIn, isLoading, currentUser, isOrdersLoading } = useAppContext();
  
  React.useEffect(() => {
    // isLoading here refers to UserContext's isLoading (authentication/user profile loading)
    if (!isLoading && !isLoggedIn) {
      navigate('/login', { state: { returnTo: '/order-history' } });
    }
  }, [isLoggedIn, navigate, isLoading]);
  
  // The getOrderHistory from context already filters by user and sorts.
  const orders = getOrderHistory();
  
  const totalSpent = orders.reduce((total, order) => total + order.total, 0);
  
  const getStatusColor = (status: OrderStatus | null) => {
    switch (status) {
      case 'new':
        return "bg-red-500"; 
      case 'confirmed':
        return "bg-green-500";
      case 'make':
        return "bg-yellow-500";
      case 'ready':
        return "bg-orange-500";
      case 'delivered':
        return "bg-blue-500";
      case 'paid':
        return "bg-green-700"; // Darker green for Paid
      case 'cancelled':
        return "bg-gray-500";
      default:
        return "bg-gray-400"; // Default for null or unknown
    }
  };

  // Combined loading state: true if either user info is loading OR orders are loading
  const isOverallLoading = isLoading || isOrdersLoading;

  if (isOverallLoading) {
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
        {/* This part for total spent can still be shown based on currently loaded orders,
            or also conditioned by !isOverallLoading if preferred */}
        {orders.length > 0 && !isOverallLoading && (
          <div className="bg-muted/20 p-4 rounded-lg mb-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Spent on Orders</p>
            <p className="text-2xl font-bold">{formatThaiCurrency(totalSpent)}</p>
          </div>
        )}
        
        {/* Show "No Orders Yet" only when not loading and orders array is empty */}
        {!isOverallLoading && orders.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-bold mb-2">No Orders Yet</h2>
            <p className="text-muted-foreground mb-6">You haven't placed any orders yet.</p>
            <Button onClick={() => navigate('/menu')}>Browse Menu</Button>
          </div>
        ) : (
          // Ensure orders are mapped only when not overall loading and orders exist
          !isOverallLoading && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="food-card overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">Order #{order.id.substring(0, 8)}...</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), 'MMM d, yyyy - h:mm a')}
                        </p>
                        {order.tableNumber && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {order.tableNumber === 'Take Away' ? 'Take Away' : `Table: ${order.tableNumber}`}
                          </p>
                        )}
                      </div>
                      {order.status && (
                         <Badge className={`${getStatusColor(order.status)} text-white capitalize`}>
                           {order.status}
                         </Badge>
                      )}
                    </div>

                    <div className="mt-3 mb-3 max-h-24 overflow-y-auto">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="text-sm flex justify-between mb-1 pr-2">
                          <span>{item.quantity}× {item.menuItem.name}</span>
                          <span>{formatThaiCurrency(item.menuItem.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-center font-semibold">
                      <span>Total</span>
                      <span>{formatThaiCurrency(order.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) // This parenthesis closes the inner conditional block
        ) // This closes the 'else' branch of the ternary (was the added one)
      }
      </div>
    </Layout>
  );
};

export default OrderHistory;
