import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa';
import { formatWhatsAppMessage } from '@/lib/utils/format-whatsapp';
import { getRestaurantSettings } from '@/lib/api/settings';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Confirm Order | ยืนยันคำสั่งซื้อ',
  description: 'Confirm your order via WhatsApp',
};

export default async function WhatsAppConfirmationPage() {
  // Get restaurant settings for WhatsApp number
  const settings = await getRestaurantSettings();
  const whatsappNumber = settings?.whatsappNumber || '66812345678'; // Default fallback

  // Get order data from cookies (will be implemented in cart/checkout flow)
  const cookieStore = cookies();
  const orderDataCookie = cookieStore.get('orderData');
  const orderData = orderDataCookie ? JSON.parse(orderDataCookie.value) : null;

  // Format WhatsApp message with order details
  const whatsappMessage = formatWhatsAppMessage(orderData);
  
  // Generate WhatsApp deep link
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-white">
      {/* Restaurant logo */}
      <div className="mb-8">
        <Image
          src="/images/logo.png"
          alt="Coconut Beach"
          width={120}
          height={120}
          className="rounded-full"
          priority
        />
      </div>

      {/* Confirmation message */}
      <h1 className="text-2xl font-bold text-center mb-12">
        Send us order details to confirm your order
      </h1>

      {/* WhatsApp button */}
      <a
        href={whatsappUrl}
        className="whatsapp-button w-full max-w-md flex items-center justify-center gap-2 bg-[#25D366] text-white py-4 px-6 rounded-lg font-medium text-lg shadow-md"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FaWhatsapp size={24} />
        <span>Send WhatsApp</span>
      </a>

      {/* Return to menu link */}
      <Link
        href="/menu"
        className="mt-8 text-secondary-600 underline"
      >
        Return to menu
      </Link>

      {/* Order success message that appears after returning from WhatsApp */}
      <div className="mt-12 text-center">
        <p className="text-green-600 font-medium">
          Your order has been saved! 
        </p>
        <p className="text-secondary-500 mt-2">
          After sending WhatsApp message, restaurant staff will confirm your order shortly.
        </p>
      </div>
    </div>
  );
}
