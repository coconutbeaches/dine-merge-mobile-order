"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function OrderPage() {
  const router = useRouter();
  // Initialize state directly from localStorage
  const [guestFirstName, setGuestFirstName] = useState<string | null>(() => {
    if (typeof window !== 'undefined') { // Check if window is defined (client-side)
      return localStorage.getItem('guest_first_name');
    }
    return null;
  });
  const [guestUserId, setGuestUserId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') { // Check if window is defined (client-side)
      return localStorage.getItem('guest_user_id');
    }
    return null;
  });

  useEffect(() => {
    console.log('OrderPage: useEffect running for redirect check');
    // If guestUserId is null after initial state, it means no session was found.
    // In this case, redirect to register page.
    if (!guestUserId) {
      console.log('OrderPage: guest_user_id not found. Redirecting to /register/unknown');
      toast.error('Guest session not found. Please register.');
      router.replace('/register/unknown'); // Placeholder, ideally should know stay_id
    }
  }, [guestUserId, router]); // Depend on guestUserId to trigger redirect if it becomes null

  if (!guestUserId) {
    console.log('OrderPage: Not rendering content, guestUserId is null (initial or after redirect).');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading user data or redirecting...</p>
      </div>
    );
  }

  console.log('OrderPage: Rendering content for', guestFirstName);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4">Welcome, {guestFirstName}!</h1>
      <p className="text-lg text-gray-700">You can now place your order.</p>
      <p className="text-sm text-gray-500 mt-4">Your User ID: {guestUserId}</p>
    </div>
  );
}
