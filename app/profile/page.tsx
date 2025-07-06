"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { updateUserProfile } from '@/services/userProfileService';

export default function Page() {
  const router = useRouter();
  const { currentUser, isLoggedIn, isLoading: isLoadingUserContext, logout } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!isLoadingUserContext && !isLoggedIn) {
      router.push('/login?returnTo=/profile');
    }
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
    }
  }, [currentUser, isLoggedIn, isLoadingUserContext, router]);

  const fetchProfileDetails = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', currentUser.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (data) {
        setPhone(data.phone || '');
      }
    } catch (error: any) {
      toast.error(`Failed to fetch profile details: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await updateUserProfile({
        id: currentUser.id,
        name,
        phone,
      });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleConvertAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast.error('Please enter both email and password to convert your account.');
      return;
    }
    setIsConverting(true);
    const result = await convertGuestToUser(newEmail, newPassword, name);
    setIsConverting(false);
    if (result.success) {
      toast.success('Account converted successfully! You can now log in with your email and password.');
      // Optionally redirect or update UI to reflect non-guest status
    } else {
      toast.error(`Failed to convert account: ${result.error || 'Unknown error'}`);
    }
  };

  if (isLoadingUserContext) {
    return (
      <Layout title="" showBackButton>
        <div className="page-container text-center py-10">Loading profile...</div>
      </Layout>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return (
      <Layout title="" showBackButton>
        <div className="page-container text-center py-10">Please log in to view your profile.</div>
      </Layout>
    );
  }

  return (
    <Layout title="" showBackButton>
      <div className="page-container max-w-2xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Account Information</CardTitle>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit Profile</span>
              </Button>
            )}
          </CardHeader>
          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing || isLoading}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isEditing || isLoading}
                />
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter className="flex justify-end gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    fetchProfileDetails();
                  }}
                >
                  Cancel
                </Button>
              </CardFooter>
            )}
          </form>
        </Card>

        {currentUser && !currentUser.email && (
          <Card className="mt-6">
            <CardHeader className="text-center">
              <CardTitle className="text-black text-2xl">
                Convert Guest Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConvertAccount}>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 text-center">
                    You are currently logged in as a guest. Convert your account to a full user account by setting an email and password.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">New Email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      disabled={isConverting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isConverting}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-black text-white hover:bg-gray-800"
                    disabled={isConverting}
                  >
                    {isConverting ? 'Converting...' : 'Convert Account'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center space-y-3">
          <Button onClick={() => router.push('/order-history')} className="w-full sm:w-auto bg-black text-white hover:bg-gray-800">
            My Orders
          </Button>
          
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" onClick={handleLogout} className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive/80">
            Log Out
          </Button>
        </div>
      </div>
    </Layout>
  );
}