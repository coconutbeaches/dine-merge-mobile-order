"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { getRestaurantSettings, type RestaurantSettings } from '@/lib/api/settings';
import { getOrderById, type OrderWithItems } from '@/lib/api/orders'; // To fetch order details
import { formatThaiCurrency } from '@/lib/utils/format-thai-currency';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react'; // WhatsApp icon

// Helper function to format the WhatsApp message and URL
const formatWhatsAppURL = (
  restaurantWhatsAppNumber: string,
  orderDetails: OrderWithItems
): string => {
  const itemsString = orderDetails.items
    .map(item => `- ${item.name} x${item.quantity} (${formatThaiCurrency(item.price)} each)`)
    .join('\n');

  const message = encodeURIComponent(`🍽️ NEW ORDER
👤 Name: ${orderDetails.customerName}
📱 Phone: ${orderDetails.customerPhone}
${orderDetails.tableNumber ? `🪑 Table: ${orderDetails.tableNumber}` : '📦 Take Away'}
📋 Order:
${itemsString}
💰 Total: ${formatThaiCurrency(orderDetails.total)}
⏰ ${new Date(orderDetails.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
📝 Order ID: ${orderDetails.id.substring(0,8)}`);
  
  return `https://wa.me/${restaurantWhatsAppNumber}?text=${message}`;
};

export default function WhatsAppConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettings | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderWithItems | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!orderId) {
        setError("Order ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const settings = await getRestaurantSettings();
        const order = await getOrderById(orderId);

        if (!settings || !settings.restaurantWhatsApp) {
          setError('Restaurant WhatsApp number is not configured.');
          setRestaurantSettings(settings); // Still set settings to display name if available
          setLoading(false);
          return;
        }
        if (!order) {
          setError('Order details could not be found.');
          setLoading(false);
          return;
        }
        
        setRestaurantSettings(settings);
        setOrderDetails(order);

        const url = formatWhatsAppURL(settings.restaurantWhatsApp, order);
        setWhatsAppUrl(url);

      } catch (err) {
        console.error("Error fetching data for WhatsApp page:", err);
        setError('Failed to load order confirmation details.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <Skeleton className="w-24 h-24 rounded-full mb-4" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-12 w-full max-w-xs" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center text-red-600">
        <p className="text-xl mb-4">{error}</p>
        <button
          onClick={() => router.push('/menu')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 text-center">
      <div className="mb-8">
        {/* Placeholder for restaurant logo - assuming a generic one for now */}
        <Image
          src="/logo-placeholder.png" // Replace with actual logo path
          alt={restaurantSettings?.restaurantName || "Restaurant"}
          width={100}
          height={100}
          className="rounded-full shadow-md"
        />
        <h1 className="text-2xl font-bold mt-4">
          {restaurantSettings?.restaurantName || "Confirm Your Order"}
        </h1>
      </div>

      <p className="text-lg text-gray-700 mb-6">
        Please send us your order details via WhatsApp to confirm.
      </p>

      {whatsAppUrl ? (
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-8 py-4 bg-green-500 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75"
        >
          <MessageCircle className="w-6 h-6 mr-3" />
          Send WhatsApp
        </a>
      ) : (
        <p className="text-gray-500">Generating WhatsApp link...</p>
      )}

      <button
        onClick={() => router.push('/menu')}
        className="mt-8 text-blue-600 hover:underline"
      >
        Or continue browsing menu
      </button>
      <p className="mt-4 text-sm text-gray-500">
        Your order has been saved to your account.
      </p>
    </div>
  );
}
