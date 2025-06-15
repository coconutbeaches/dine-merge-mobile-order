
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { CheckCircle, MessageSquare, Loader2 } from 'lucide-react';
import { useFetchOrderById } from '@/hooks/useFetchOrderById';

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId } = location.state || {};
  const { order, isLoading } = useFetchOrderById(orderId);

  useEffect(() => {
    // If someone navigates directly to this page without an order ID, redirect to home
    if (!orderId) {
      setTimeout(() => {
        navigate('/');
      }, 5000);
    }
  }, [orderId, navigate]);

  const handleSendWhatsApp = () => {
    if (!order) return;

    const phoneNumber = '660926025572';

    const itemsDetails = order.order_items.map(item => {
      const optionsText = item.optionsString ? ` (${item.optionsString})` : '';
      return `- ${item.quantity}x ${item.name}${optionsText}`;
    }).join('\n');

    const customerName = order.customer_name || order.customer_name_from_profile || 'Guest';
    const tableNumber = order.table_number || 'Takeaway';
    const formattedTotal = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(order.total_amount);

    const message = `*New Order: #${order.id}*

*Customer:* ${customerName}
*Table:* ${tableNumber}

*Items:*
${itemsDetails}

*Total:* ${formattedTotal}`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Layout title="Order Confirmation" showBackButton={false}>
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          </CardHeader>
          <CardContent className="text-center">
            {orderId ? (
              <div className="space-y-4">
                <p className="text-lg">
                  Thank you for your order!
                </p>
                <p>
                  Please send your order to us via WhatsApp to complete your order.
                </p>
                <p className="font-bold">Order #{orderId}</p>
              </div>
            ) : (
              <p className="text-yellow-600">
                No order information found. Redirecting to home page...
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-4">
            {orderId && (
              <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700 text-white" disabled={isLoading || !order}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading Details...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send via WhatsApp
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/order-history')}>Order History</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default OrderConfirmation;
