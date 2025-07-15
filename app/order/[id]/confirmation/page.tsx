"use client";

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownCircle, MessageSquare, Loader2 } from 'lucide-react';
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

    const customerName = order.customer_name || order.customer_name_from_profile || order.guest_first_name || 'Guest';
    const tableNumber = order.table_number || 'Takeaway';
    const formattedTotal = formatThaiCurrency(order.total_amount);

    // Check if this is a walk-in customer
    const isWalkIn = order.stay_id && order.stay_id.toLowerCase().includes('walkin');
    
    // Format customer name based on type
    let displayCustomerName = customerName;
    if (isWalkIn) {
      displayCustomerName = `Walkin ${customerName}`;
    } else {
      // All non-walkin customers are hotel guests and should have stay_id
      const stayId = order.stay_id || 'Guest';
      displayCustomerName = `${stayId} ${customerName}`;
    }

    const message = `${tableNumber} // ${displayCustomerName}
*Order: #${order.id}*

*Items:*
${itemsDetails}

*Total:* ${formattedTotal}`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    // Track WhatsApp conversion
    trackWhatsAppSend(order.id, order.total_amount);
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

  const customerName = order.customer_name || order.customer_name_from_profile || order.guest_first_name || 'Guest';
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
          <Card className="mb-8 border-0 shadow-xl bg-white backdrop-blur-sm confirmation-card confirmation-header">
            <CardHeader className="text-center py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-black/10 rounded-full w-32 h-32 mx-auto animate-pulse"></div>
                <ArrowDownCircle className="relative mx-auto h-20 w-20 text-black mb-6 animate-bounce" />
              </div>
              
              {/* WhatsApp Button directly under the circle */}
              <div style={{ 
                backgroundColor: '#16a34a', 
                borderRadius: '0.5rem',
                padding: '0.75rem 1.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                border: 'none'
              }}
              onClick={handleSendWhatsApp}
              >
                <MessageSquare className="mr-3 h-5 w-5 text-white" />
                <span className="text-white font-medium text-lg">Send Order via WhatsApp</span>
              </div>
              
              {/* Instructional text below WhatsApp button */}
              <p className="text-black text-center mt-4 text-sm font-medium">
                To complete your order, send via whatsapp
              </p>
            </CardHeader>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default OrderConfirmationById;
