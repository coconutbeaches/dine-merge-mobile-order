
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { OrderStatus } from '@/types';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { getOrderHistory, isLoggedIn } = useAppContext();
  
  // Redirect to login if not logged in
  if (!isLoggedIn) {
    navigate('/login', { state: { returnTo: '/order-history' } });
    return null;
  }
  
  const orders = getOrderHistory();
  
  // Status badge colors
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return "bg-yellow-500";
      case OrderStatus.CONFIRMED:
        return "bg-blue-500";
      case OrderStatus.PREPARING:
        return "bg-purple-500";
      case OrderStatus.READY:
        return "bg-green-500";
      case OrderStatus.OUT_FOR_DELIVERY:
        return "bg-indigo-500";
      case OrderStatus.DELIVERED:
        return "bg-green-700";
      case OrderStatus.CANCELLED:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };
  
  return (
    <Layout title="Order History" showBackButton>
      <div className="page-container">
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
                      <h3 className="font-semibold">Order #{order.id.split('-')[1]}</h3>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt), 'MMM d, yyyy - h:mm a')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div className="mt-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm flex justify-between mb-1">
                        <span>{item.quantity}× {item.menuItem.name}</span>
                        <span>${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-200 mt-3 pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => navigate(`/order/${order.id}`)}
                  >
                    View Details
                  </Button>
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
