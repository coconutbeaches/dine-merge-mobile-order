"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get('returnTo') || '/';
  const { loginOrSignup } = useAppContext();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginOrSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both email and password',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    const result = await loginOrSignup(email, password, name);
    setIsLoading(false);
    if (result.success) {
      if (result.a_new_user_was_created) {
        toast({
          title: 'Welcome!',
          description: 'Your account has been created successfully.',
        });
      }
      router.push(returnTo);
    } else {
      toast({
        title: 'Error',
        description:
          result.error || 'An unknown error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          window.location.origin + (returnTo !== '/' ? returnTo : '/menu'),
      },
    });
    if (error) {
      toast({
        title: 'Google Sign-In Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    const result = await loginAsGuest();
    setIsLoading(false);
    if (result.success) {
      router.push(returnTo);
    } else {
      toast({
        title: 'Error',
        description:
          result.error || 'An unknown error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout title="" showBackButton>
      <div className="page-container">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-black text-2xl">
              Login or Sign Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLoginOrSignup}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-black hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-gray-800"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Continue with Email'}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  Sign in with Google
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleGuestLogin}
                  disabled={isLoading}
                >
                  Continue as Guest
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <Layout title="" showBackButton>
        <div className="page-container">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
              <p className="text-lg text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    }>
      <LoginContent />
    </Suspense>
  );
}
