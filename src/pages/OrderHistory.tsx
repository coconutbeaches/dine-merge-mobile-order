
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { OrderStatus } from '@/types';
import { formatThaiCurrency } from '@/lib/utils';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { getOrderHistory, isLoggedIn, isLoading } = useAppContext();
  
  // Redirect to login if not logged in
  React.useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      navigate('/login', { state: { returnTo: '/order-history' } });
    }
  }, [isLoggedIn, navigate, isLoading]);
  
  const orders = getOrderHistory();
  
  // Calculate total spent on all orders
  const totalSpent = orders.reduce((total, order) => total + order.total, 0);
  
  // Status badge colors
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.NEW:
        return "bg-red-500";
      case OrderStatus.CONFIRMED:
        return "bg-green-500";
      case OrderStatus.MAKE:
        return "bg-yellow-500";
      case OrderStatus.READY:
        return "bg-orange-500";
      case OrderStatus.DELIVERED:
        return "bg-blue-500";
      case OrderStatus.PAID:
        return "bg-green-700";
      case OrderStatus.CANCELLED:
        return "bg-gray-500";
      default:
        return "bg-gray-500";
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
          <div className="bg-muted/20 p-4 rounded-lg mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Order History Total</p>
            <p className="text-xl font-bold">{formatThaiCurrency(totalSpent)}</p>
          </div>
        )}
        
        {orders.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-bold mb-2">No Orders Yet</h2>
            <p className="text-muted-foreground mb-6">You haven't placed any orders yet</p>
            <Button onClick={() => navigate('/menu')}>Browse Menu</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="food-card">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">Order #{order.id.split('-')[1] || order.id}</h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), 'MMM d, yyyy - h:mm a')}
                      </p>
                      {order.tableNumber && (
                        <p className="text-xs text-muted-foreground">
                          {order.tableNumber === 'Take Away' ? 'Take Away' : `Table ${order.tableNumber}`}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="mt-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm flex justify-between mb-1">
                        <span>{item.quantity}× {item.menuItem.name}</span>
                        <span>{formatThaiCurrency(item.menuItem.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-200 mt-3 pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatThaiCurrency(order.total)}</span>
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
