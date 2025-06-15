
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, MessageSquare } from 'lucide-react';

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

  const handleSendWhatsApp = () => {
    const phoneNumber = '660926025572';
    const message = `Hello, I have a new order. Order ID: #${orderId}`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

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
                  Thank you for your order!
                </p>
                <p>
                  Please send your order details to us via WhatsApp to complete the process.
                </p>
                <p className="font-bold">Order ID: #{orderId}</p>
              </div>
            ) : (
              <p className="text-yellow-600">
                No order information found. Redirecting to home page...
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/order-history')}>View Order History</Button>
            {orderId && (
              <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
                <MessageSquare className="mr-2 h-4 w-4" />
                Send via WhatsApp
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default OrderConfirmation;
