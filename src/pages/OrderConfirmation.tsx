
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = location.state || {};

  useEffect(() => {
    // If someone navigates directly to this page without an order ID, redirect to home
    if (!orderId) {
      setTimeout(() => {
        navigate('/');
      }, 5000);
    }
  }, [orderId, navigate]);

  return (
    <Layout title="Order Confirmation" showBackButton={false}>
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-2xl font-bold">Order Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {orderId ? (
              <div className="space-y-4">
                <p className="text-lg">
                  Thank you for your order. Your order number is: <strong>#{orderId}</strong>
                </p>
                <p>
                  We have received your order and are processing it now. 
                  You will receive updates on your order status.
                </p>
                <div className="border rounded-lg p-4 bg-gray-50 mt-6">
                  <h3 className="font-medium text-lg mb-2">What's Next?</h3>
                  <p>
                    You can check the status of your order in your order history. 
                    We'll notify you when your order is ready for pickup or on its way for delivery.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-yellow-600">
                No order information found. Redirecting to home page...
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-center space-x-4">
            <Button onClick={() => navigate('/order-history')}>View Order History</Button>
            <Button variant="outline" onClick={() => navigate('/menu')}>Continue Shopping</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default OrderConfirmation;
