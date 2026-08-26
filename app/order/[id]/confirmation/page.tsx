"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowDownCircle, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';
import { useFetchOrderById } from '@/hooks/useFetchOrderById';
import { formatThaiCurrency } from '@/lib/utils';
import OrderErrorFallback from '@/components/order/OrderErrorFallback';
import { trackOrderComplete, trackWhatsAppSend, trackPageView } from '@/lib/analytics';
import {
  appendRestaurantOrderRef,
  restaurantOrderRefFromHash,
} from '@/lib/restaurantWhatsAppMessage';
import { getRestaurantHandshakeBrowserProof } from '@/lib/restaurantHandshakeSession';
import { isRestaurantServiceLocation } from '@/lib/restaurantServiceLocation';
import { toast } from 'sonner';

const AUTO_DELIVERY_POLL_MS = 2000;
const AUTO_DELIVERY_MAX_POLLS = 60;

type AutoDeliveryStatus = 'idle' | 'pending' | 'sent' | 'failed' | 'uncertain';

type AutoDeliveryPayload = {
  status?: 'pending' | 'sent' | 'failed' | 'uncertain';
  code?: string;
  safe_manual_fallback?: boolean;
};

const OrderConfirmationById = () => {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { order, isLoading, error, retry } = useFetchOrderById(orderId);
  const [orderNumberRef, setOrderNumberRef] = useState<string | null>(null);
  const [referenceChecked, setReferenceChecked] = useState(false);
  const [autoDeliveryStatus, setAutoDeliveryStatus] = useState<AutoDeliveryStatus>('idle');

  useEffect(() => {
    if (!orderId) {
      setTimeout(() => {
        router.push('/');
      }, 3000);
    }

    const readReference = () => {
      setOrderNumberRef(restaurantOrderRefFromHash(window.location.hash));
      setReferenceChecked(true);
    };
    readReference();
    window.addEventListener('hashchange', readReference);
    trackPageView(`${window.location.origin}${window.location.pathname}`, 'Order Confirmation');
    return () => window.removeEventListener('hashchange', readReference);
  }, [orderId, router]);

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

  useEffect(() => {
    if (!order || !referenceChecked) return;

    const tableNumber = String(order.table_number || '').trim();
    if (!isRestaurantServiceLocation(tableNumber)) {
      setAutoDeliveryStatus('idle');
      return;
    }

    if (!orderNumberRef || orderNumberRef !== String(order.id)) {
      setAutoDeliveryStatus('failed');
      return;
    }

    const proof = getRestaurantHandshakeBrowserProof();
    if (!proof?.handshake_ref) {
      // Existing guests without an exact v2 WhatsApp binding safely retain the
      // original manual path. No automatic send has been attempted yet.
      setAutoDeliveryStatus('failed');
      return;
    }

    let cancelled = false;
    let pollCount = 0;
    let timer: number | null = null;

    const scheduleRetry = () => {
      if (cancelled) return;
      pollCount += 1;
      if (pollCount >= AUTO_DELIVERY_MAX_POLLS) {
        setAutoDeliveryStatus('uncertain');
        return;
      }
      timer = window.setTimeout(runDelivery, AUTO_DELIVERY_POLL_MS);
    };

    const runDelivery = async () => {
      if (cancelled) return;
      setAutoDeliveryStatus((current) =>
        current === 'uncertain' ? 'uncertain' : 'pending'
      );

      try {
        const response = await fetch('/api/restaurant/order-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({
            order_id: order.id,
            handshake_ref: proof.handshake_ref,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as AutoDeliveryPayload;
        if (cancelled) return;

        if (!response.ok) {
          // A lost/failed HTTP response does not prove the WHAPI send did not
          // happen. Keep the manual path hidden and reconcile by retrying the
          // idempotent endpoint.
          setAutoDeliveryStatus('uncertain');
          scheduleRetry();
          return;
        }

        if (payload.status === 'sent') {
          setAutoDeliveryStatus('sent');
          return;
        }

        if (payload.status === 'failed' && payload.safe_manual_fallback === true) {
          console.warn('[restaurant-order-delivery] automatic send failed safely', {
            orderId: order.id,
            code: payload.code || 'unknown',
          });
          setAutoDeliveryStatus('failed');
          return;
        }

        if (payload.status === 'pending') {
          setAutoDeliveryStatus('pending');
          scheduleRetry();
          return;
        }

        // Any uncertain or malformed response is treated as potentially sent.
        // Never expose the manual button until the server explicitly proves a
        // safe failure.
        setAutoDeliveryStatus('uncertain');
        scheduleRetry();
      } catch (deliveryError) {
        if (cancelled) return;
        console.warn('[restaurant-order-delivery] browser transport uncertain', deliveryError);
        setAutoDeliveryStatus('uncertain');
        scheduleRetry();
      }
    };

    runDelivery();

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [order, orderNumberRef, referenceChecked]);

  const handleSendWhatsApp = () => {
    if (!order) return;
    if (!orderNumberRef || orderNumberRef !== String(order.id)) {
      toast.error('This order number is missing or invalid. Please place the order again.');
      return;
    }

    const phoneNumber = '66631457299';

    const itemsDetails = order.order_items.map(item => {
      const optionsText = item.optionsString ? ` (${item.optionsString})` : '';
      const itemName = item.name || (item as { product?: string }).product || 'Item';
      return `- ${item.quantity}x ${itemName}${optionsText}`;
    }).join('\n');

    const customerName = order.customer_name || order.customer_name_from_profile || order.guest_first_name || 'Guest';
    const tableNumber = order.table_number || 'Takeaway';
    const formattedTotal = formatThaiCurrency(order.total_amount);

    const isWalkIn = order.stay_id && order.stay_id.toLowerCase().includes('walkin');

    let displayCustomerName = customerName;
    if (isWalkIn) {
      displayCustomerName = `Walkin ${customerName}`;
    } else {
      const formattedStayId = order.stay_id ? order.stay_id.replace(/_/g, ' ') : 'Guest';
      displayCustomerName = `${formattedStayId} ${customerName}`;
    }

    const readableMessage = `${tableNumber} // ${displayCustomerName}
*Order: #${order.id}*

*Items:*
${itemsDetails}

*Total:* ${formattedTotal}`;
    const message = appendRestaurantOrderRef(readableMessage, orderNumberRef);

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    trackWhatsAppSend(order.id, order.total_amount);
  };

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

  const autoDeliveryEnabled = isRestaurantServiceLocation(order.table_number);
  const showManualButton = !autoDeliveryEnabled || autoDeliveryStatus === 'failed';
  const showConfirmed = autoDeliveryEnabled && autoDeliveryStatus === 'sent';
  const showAutomaticProgress =
    autoDeliveryEnabled &&
    !showManualButton &&
    !showConfirmed;

  return (
    <Layout title="Order Confirmation" showBackButton={false}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container py-8 px-4 max-w-4xl mx-auto">
          <Card className="mb-8 border-0 shadow-xl bg-white backdrop-blur-sm confirmation-card confirmation-header">
            <CardHeader className="text-center py-12">
              {showConfirmed ? (
                <>
                  <CheckCircle2 className="mx-auto h-20 w-20 text-green-600 mb-6" />
                  <div
                    className="mx-auto inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 text-lg font-medium text-white shadow-lg"
                  >
                    Order Confirmed
                  </div>
                  <p className="text-black text-center mt-4 text-sm font-medium">
                    Your order was sent to the restaurant. The kitchen has it now.
                  </p>
                </>
              ) : showAutomaticProgress ? (
                <>
                  <Loader2 className="mx-auto h-16 w-16 animate-spin text-black mb-6" />
                  <p className="text-xl font-semibold text-black">
                    {autoDeliveryStatus === 'uncertain'
                      ? 'Confirming order delivery…'
                      : 'Sending your order via WhatsApp…'}
                  </p>
                  <p className="text-black text-center mt-4 text-sm font-medium">
                    Please keep this page open. Do not resend the order while we confirm it.
                  </p>
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-black/10 rounded-full w-32 h-32 mx-auto animate-pulse"></div>
                    <ArrowDownCircle className="relative mx-auto h-20 w-20 text-black mb-6 animate-bounce" />
                  </div>

                  {autoDeliveryEnabled && autoDeliveryStatus === 'failed' && (
                    <p className="text-black text-center mb-4 text-sm font-medium">
                      Automatic delivery was unavailable. Please use WhatsApp below to complete the order.
                    </p>
                  )}

                  <div style={{
                    backgroundColor: '#16a34a',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: orderNumberRef ? 'pointer' : 'not-allowed',
                    opacity: orderNumberRef ? 1 : 0.6,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: 'none'
                  }}
                  onClick={orderNumberRef ? handleSendWhatsApp : undefined}
                  aria-disabled={!orderNumberRef}
                  >
                    <MessageSquare className="mr-3 h-5 w-5 text-white" />
                    <span className="text-white font-medium text-lg">Send Order via WhatsApp</span>
                  </div>

                  <p className="text-black text-center mt-4 text-sm font-medium">
                    To complete your order, send via whatsapp
                  </p>
                </>
              )}
            </CardHeader>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default OrderConfirmationById;
