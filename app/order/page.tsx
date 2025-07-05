"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useGuestContext } from '@/context/GuestContext';

export default function OrderPage() {
  const router = useRouter();
  const { getGuestSession } = useGuestContext();

  useEffect(() => {
    const guestSession = getGuestSession();
    if (!guestSession) {
      // Redirect to a generic register page if no stay_id is known
      router.replace('/register/some_default_stay_id'); // You might want to make this more dynamic
    }
  }, [getGuestSession, router]);

  // Render the order page content if guestSession exists
  return (
    <Layout title="Your Order" showBackButton>
      <div className="page-container">
        {/* Your order page content goes here */}
        <h1 className="text-2xl font-bold mb-4">Your Order</h1>
        <p>Welcome, guest! You can now place your order.</p>
        {/* Example: Display guest info */}
        {getGuestSession() && (
          <p>Guest: {getGuestSession()?.first_name} (Stay ID: {getGuestSession()?.stay_id})</p>
        )}
      </div>
    </Layout>
  );
}
