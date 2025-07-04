"use client";

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, MessageSquare, Loader2, ShoppingBag, Clock, User, MapPin, Share2, Download } from 'lucide-react';
import { useFetchOrderById } from '@/hooks/useFetchOrderById';
import { formatThaiCurrency } from '@/lib/utils';
import OrderErrorFallback from '@/components/order/OrderErrorFallback';
import { trackOrderComplete, trackWhatsAppSend, trackPageView } from '@/lib/analytics';

const OrderConfirmationById = () => {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { order, isLoading, error, retry } = useFetchOrderById(orderId);

  useEffect(() => {
    // If someone navigates directly to this page without an order ID, redirect to home
    if (!orderId) {
      setTimeout(() => {
        router.push('/');
      }, 3000);
    }
    
    trackPageView(window.location.href, 'Order Confirmation');
  }, [orderId, router]);

  // Track order completion when order data is loaded
  useEffect(() => {
    if (order && orderId) {
      trackOrderComplete({
        orderId,
        totalAmount: order.total_amount,
        itemCount: order.order_items.length,
        customerType: order.customer_name ? 'registered' : 'guest',
      });
    }
  }, [order, orderId]);

  const handleSendWhatsApp = () => {
    if (!order) return;

    const phoneNumber = '66631457299';

    const itemsDetails = order.order_items.map(item => {
      const optionsText = item.optionsString ? ` (${item.optionsString})` : '';
      const itemName = item.name || (item as { product?: string }).product || 'Item';
      return `- ${item.quantity}x ${itemName}${optionsText}`;
    }).join('\n');

    const customerName = order.customer_name || order.customer_name_from_profile || 'Guest';
    const tableNumber = order.table_number || 'Takeaway';
    const formattedTotal = formatThaiCurrency(order.total_amount);

    const message = `*Order: #${order.id}*

*Customer:* ${customerName}
*Table:* ${tableNumber}

*Items:*
${itemsDetails}

*Total:* ${formattedTotal}`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    // Track WhatsApp conversion
    trackWhatsAppSend(order.id, order.total_amount);
  };

  const handleContinueShopping = () => {
    router.push('/');
  };

  const handleViewOrders = () => {
    router.push('/order-history');
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout title="Order Confirmation" showBackButton={false}>
        <div className="container py-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">Loading order details...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error || (!isLoading && !order)) {
    return (
      <Layout title="Order Confirmation" showBackButton={false}>
        <OrderErrorFallback 
          orderId={orderId}
          error={error}
          onRetry={retry}
          showRetry={!!error && !error.message?.includes('not found')}
        />
      </Layout>
    );
  }

  const customerName = order.customer_name || order.customer_name_from_profile || 'Guest';
  const tableNumber = order.table_number || 'Takeaway';
  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Layout title="Order Confirmation" showBackButton={false}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container py-8 px-4 max-w-4xl mx-auto">
          {/* Success Header */}
          <Card className="mb-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm confirmation-card confirmation-header">
            <CardHeader className="text-center py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/10 rounded-full w-32 h-32 mx-auto animate-pulse"></div>
                <CheckCircle className="relative mx-auto h-20 w-20 text-green-500 mb-6 animate-bounce" />
              </div>
              <CardTitle className="text-3xl md:text-4xl font-bold text-green-600 mb-4">
                Order Confirmed!
              </CardTitle>
              <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                Thank you for your order. Your order has been successfully placed and will be prepared shortly.
              </p>
              <div className="mt-6 inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-full text-green-700 text-sm font-medium">
                <Clock className="mr-2 h-4 w-4" />
                Order #{order.id}
              </div>
            </CardHeader>
          </Card>

          {/* Order Summary */}
          <Card className="mb-8 border-0 shadow-lg bg-white confirmation-card">
            <CardHeader className="bg-black text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-white">
                <ShoppingBag className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium">Order #</span>
                    <span className="font-bold text-black">#{order.id}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Date
                    </span>
                    <span className="font-medium text-black">{orderDate}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer
                    </span>
                    <span className="font-medium text-black">{customerName}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Table
                    </span>
                    <span className="font-medium text-black">{tableNumber}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Order Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-black flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Items Ordered
                </h3>
                <div className="space-y-3">
                  {order.order_items.map((item, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow confirmation-item">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-black text-lg">{item.name}</span>
                            <span className="bg-black text-white px-2 py-1 rounded-full text-xs font-medium">
                              × {item.quantity}
                            </span>
                          </div>
                          {item.optionsString && (
                            <p className="text-sm text-gray-600 bg-white px-3 py-1 rounded border">
                              {item.optionsString}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xl font-bold text-black">
                            {formatThaiCurrency(item.price * item.quantity)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatThaiCurrency(item.price)} each
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-6" />

              {/* Total */}
              <div className="bg-black text-white p-6 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">Total Amount</span>
                  <span className="text-2xl font-bold">{formatThaiCurrency(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="border-0 shadow-lg bg-white confirmation-card">
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-black mb-3">Next Steps</h3>
                  <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
                    Please send your order to us via WhatsApp to complete your order and confirm preparation time.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Primary WhatsApp Button */}
                  <Button 
                    onClick={handleSendWhatsApp} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl confirmation-whatsapp-btn"
                    size="lg"
                  >
                    <MessageSquare className="mr-3 h-5 w-5" />
                    Send Order via WhatsApp
                  </Button>
                  
                  {/* Secondary Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handleViewOrders}
                      size="lg"
                      className="flex-1 border-black text-black hover:bg-black hover:text-white confirmation-secondary-btn"
                    >
                      <User className="mr-2 h-4 w-4" />
                      View Order History
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleContinueShopping}
                      size="lg"
                      className="flex-1 border-black text-black hover:bg-black hover:text-white confirmation-secondary-btn"
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default OrderConfirmationById;
