"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getGuestSession, getRegistrationUrl } from '@/utils/guestSession';

export default function OrderPage() {
  const router = useRouter();
  const [guestSession, setGuestSession] = useState<ReturnType<typeof getGuestSession>>(null);

  useEffect(() => {
    const session = getGuestSession();
    if (session) {
      setGuestSession(session);
    } else {
      // No guest session found - redirect to registration
      const redirectUrl = getRegistrationUrl();
      console.log('OrderPage: No guest session found. Redirecting to:', redirectUrl);
      toast.error('Guest session not found. Please register.');
      router.replace(redirectUrl);
    }
  }, [router]);

  if (!guestSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p>Loading user data or redirecting...</p>
      </div>
    );
  }

  console.log('OrderPage: Rendering content for', guestSession.guest_first_name);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome, {guestSession.guest_first_name}!</h1>
      <p className="text-lg text-gray-700">You can now place your order.</p>
      <p className="text-sm text-gray-500 mt-4">Your User ID: {guestSession.guest_user_id}</p>
      <p className="text-sm text-gray-500">Stay ID: {guestSession.guest_stay_id}</p>
    </div>
  );
}
