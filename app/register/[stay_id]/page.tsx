"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGuestContext } from '@/context/GuestContext';

export default function GuestRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const stayId = params.stay_id as string;
  const { setGuestSession, getGuestSession } = useGuestContext();

  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const guestSession = getGuestSession();
    if (guestSession && guestSession.stay_id === stayId) {
      // If a valid guest session already exists for this stay_id, redirect to order page
      router.replace('/order');
    }
  }, [stayId, router, getGuestSession]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your first name.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('guests')
        .insert([{ stay_id: stayId, first_name: firstName.trim() }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setGuestSession({
          guest_id: data.id,
          first_name: data.first_name,
          stay_id: data.stay_id,
        });
        toast({
          title: 'Success',
          description: 'Guest session started!',
        });
        router.push('/order');
      }
    } catch (error: any) {
      console.error('Error registering guest:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start guest session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="" showBackButton={false}>
      <div className="page-container">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-black text-2xl">
              Welcome to {stayId}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContinue}>
              <div className="space-y-4">
                <p className="text-center text-gray-600">
                  Please enter your first name to continue.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800"
                  disabled={isLoading}
                >
                  {isLoading ? 'Continuing...' : 'Continue'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
