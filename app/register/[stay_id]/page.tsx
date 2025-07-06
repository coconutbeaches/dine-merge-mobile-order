"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { supabase } from '@/integrations/supabase/client'; // Corrected import
import { toast } from 'sonner';

export default function RegisterPage({ params }: { params: Promise<{ stay_id: string }> }) {
  const { stay_id } = React.use(params);
  const router = useRouter();
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    const guestUserId = localStorage.getItem('guest_user_id');
    if (guestUserId) {
      router.replace('/order'); // Redirect if already logged in
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("handleSubmit called");
    e.preventDefault();

    console.log(" Submitting:", { firstName, stayId: stay_id });

    if (!firstName.trim()) {
      toast.error('Please enter your first name.');
      return;
    }

    const userId = nanoid();

    try {
      const { error } = await supabase
        .from('guest_users')
        .insert({ user_id: userId, first_name: firstName.trim(), stay_id });

      if (error) {
        console.error('Supabase insert error:', error);
        toast.error('Failed to register. Please try again.');
        return;
      } else {
        console.log('Guest registered successfully');
      }

      localStorage.setItem('guest_user_id', userId);
      localStorage.setItem('guest_first_name', firstName.trim());
      toast.success('Registration successful!');
      router.replace('/order');
      return;
    } catch (err: any) {
      console.error('Unexpected error during registration:', err);
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Welcome!</h1>
        <p className="text-gray-600 mb-6 text-center">You're checking in to <span className="font-semibold">{stay_id}</span></p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Your First Name
            </label>
            <input
              type="text"
              id="firstName"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Check In
          </button>
        </form>
      </div>
    </div>
  );
}
