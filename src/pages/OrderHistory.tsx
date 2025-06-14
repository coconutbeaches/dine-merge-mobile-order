
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
import { calculateTotalPrice } from '@/utils/productUtils';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { getOrderHistory, isLoggedIn, isLoading } = useAppContext();
  
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
                        {/* Date: Jun 14 2025  8:39 PM (no dash, two spaces before time) */}
                        {format(new Date(order.created_at), "MMM dd yyyy  h:mm a")}
                      </p>
                      {order.table_number && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {/* No colon, just "Table 6" or "Take Away" */}
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
                      const hasMenuItem = item.menuItem && typeof item.menuItem === 'object';
                      const name = hasMenuItem ? item.menuItem.name : (item.name || "Item");
                      const quantity = item.quantity || 1;
                      const selectedOptions = item.selectedOptions;

                      const lineItemTotal = hasMenuItem 
                        ? calculateTotalPrice(item.menuItem, selectedOptions || {}) * quantity
                        : (item.price || 0) * quantity;
                      
                      return (
                        <div key={idx} className="text-sm mb-1">
                          <div className="flex justify-between pr-2">
                            <span>
                              {quantity}× {name}
                            </span>
                            <span>{formatThaiCurrency(lineItemTotal)}</span>
                          </div>

                          {selectedOptions && Object.keys(selectedOptions).length > 0 && (
                            <div className="pl-5 text-xs text-muted-foreground">
                              {Object.values(selectedOptions)
                                .flat()
                                .filter(Boolean)
                                .map((value: any, i: number) => (
                                  <div key={i}>{String(value)}</div>
                                ))}
                            </div>
                          )}
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
