"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { updateUserProfile } from '@/services/userProfileService';
import { getGuestSession, hasGuestSession } from '@/utils/guestSession';

export default function Page() {
  const router = useRouter();
  const { currentUser, isLoggedIn, isLoading: isLoadingUserContext, logout, convertGuestToUser } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Hotel guest state
  const [isHotelGuest, setIsHotelGuest] = useState(false);
  const [guestSession, setGuestSession] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyMemberOrderCounts, setFamilyMemberOrderCounts] = useState(new Map());

  useEffect(() => {
    const checkAndSetupProfile = async () => {
      // Check for hotel guest session first
      if (hasGuestSession()) {
        const session = getGuestSession();
        setIsHotelGuest(true);
        setGuestSession(session);
        
        if (session) {
          // Fetch all family members for this stay_id
          try {
            const { data, error } = await supabase
              .from('guest_users')
              .select('*')
              .eq('stay_id', session.guest_stay_id)
              .order('created_at', { ascending: true });
            
            if (error) {
              console.error('Error fetching family members:', error);
              toast.error('Failed to load family members');
            } else {
              setFamilyMembers(data || []);
              
              // Check which family members have orders
              await checkFamilyMembersWithOrders(data || []);
            }
          } catch (error) {
            console.error('Error fetching family members:', error);
            toast.error('Failed to load family members');
          }
        }
        return; // Don't redirect hotel guests
      }
      
      // Handle regular authenticated users
      if (!isLoadingUserContext && !isLoggedIn) {
        router.push('/login?returnTo=/profile');
        return;
      }
      
      if (currentUser) {
        setName(currentUser.name || '');
        setEmail(currentUser.email || '');
        setPhone(currentUser.phone || '');
        setIsHotelGuest(false);
      }
    };
    
    checkAndSetupProfile();
  }, [currentUser, isLoggedIn, isLoadingUserContext, router]);

  // Hotel guest functions
  const checkFamilyMembersWithOrders = async (members) => {
    try {
      const memberIds = members.map(member => member.user_id);
      const { data: orders, error } = await supabase
        .from('orders')
        .select('guest_user_id')
        .in('guest_user_id', memberIds);
      
      if (error) {
        console.error('Error checking family member orders:', error);
        return;
      }
      
      // Count orders for each family member
      const orderCounts = new Map();
      memberIds.forEach(memberId => {
        const memberOrders = orders?.filter(order => order.guest_user_id === memberId) || [];
        orderCounts.set(memberId, memberOrders.length);
      });
      
      setFamilyMemberOrderCounts(orderCounts);
    } catch (error) {
      console.error('Error checking family member orders:', error);
    }
  };
  
  const updateFamilyMemberName = (userId, newName) => {
    setFamilyMembers(prev => 
      prev.map(member => 
        member.user_id === userId 
          ? { ...member, first_name: newName }
          : member
      )
    );
  };
  
  
  const removeFamilyMember = async (userId) => {
    if (familyMembers.length <= 1) {
      toast.error('Cannot remove the last family member');
      return;
    }
    
    try {
      // Check if the family member has any orders
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('guest_user_id', userId)
        .limit(1);
      
      if (orderError) {
        console.error('Error checking orders:', orderError);
        toast.error('Failed to check for existing orders');
        return;
      }
      
      if (orders && orders.length > 0) {
        toast.error('Cannot remove family member who has placed orders. Orders must be managed separately.');
        return;
      }
      
      // Proceed with deletion if no orders found
      const { error } = await supabase
        .from('guest_users')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        toast.error('Failed to remove family member');
        return;
      }
      
      setFamilyMembers(prev => prev.filter(member => member.user_id !== userId));
      toast.success('Family member removed');
    } catch (error) {
      console.error('Error removing family member:', error);
      toast.error('Failed to remove family member');
    }
  };
  
  const saveFamilyMembers = async () => {
    if (!familyMembers.length) return;
    
    setIsLoading(true);
    try {
      for (const member of familyMembers) {
        const { error } = await supabase
          .from('guest_users')
          .update({ first_name: member.first_name })
          .eq('user_id', member.user_id);
        
        if (error) {
          throw error;
        }
      }
      
      toast.success('Family member names updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating family members:', error);
      toast.error('Failed to update family member names');
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoadingUserContext && !isHotelGuest) {
    return (
      <Layout title="" showBackButton>
        <div className="page-container text-center py-10">Loading profile...</div>
      </Layout>
    );
  }

  if (!isHotelGuest && (!isLoggedIn || !currentUser)) {
    return (
      <Layout title="" showBackButton>
        <div className="page-container text-center py-10">Please log in to view your profile.</div>
      </Layout>
    );
  }

  // Hotel guest logout function
  const handleHotelGuestLogout = () => {
    localStorage.removeItem('guest_user_id');
    localStorage.removeItem('guest_first_name');
    localStorage.removeItem('guest_stay_id');
    router.push('/');
  };

  return (
    <Layout title="" showBackButton>
      <div className="page-container max-w-2xl mx-auto">
        {isHotelGuest ? (
          // Hotel Guest Profile
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Family Members</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="p-1 h-auto">
                      <Edit className="h-3 w-3" />
                      <span className="sr-only">Edit Names</span>
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Room: {guestSession?.guest_stay_id?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => router.push('/order-history')} size="sm" className="bg-black text-white hover:bg-gray-800">
                  View Orders
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {familyMembers.map((member, index) => {
                const orderCount = familyMemberOrderCounts.get(member.user_id) || 0;
                const hasOrders = orderCount > 0;
                const canDelete = !hasOrders && familyMembers.length > 1;
                
                return (
                  <div key={member.user_id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          id={`member-${member.user_id}`}
                          value={member.first_name}
                          onChange={(e) => updateFamilyMemberName(member.user_id, e.target.value)}
                          disabled={!isEditing || isLoading}
                          placeholder="Enter name"
                          className="pr-20"
                        />
                        {hasOrders && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-700 bg-white border border-gray-300 px-2 py-0.5 rounded">
                            {orderCount} order{orderCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {isEditing && canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFamilyMember(member.user_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    {isEditing && !canDelete && familyMembers.length > 1 && (
                      <div className="px-3 py-2">
                        <Trash2 className="h-4 w-4 text-gray-300" title={hasOrders ? "Cannot delete - has orders" : "Cannot delete - last member"} />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
            {isEditing && (
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={saveFamilyMembers} 
                  disabled={isLoading}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </CardFooter>
            )}
          </Card>
        ) : (
          // Regular User Profile
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      fetchProfileDetails();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </Button>
                </CardFooter>
              )}
            </form>
          </Card>
        )}

        {!isHotelGuest && currentUser && !currentUser.email && (
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


        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            onClick={isHotelGuest ? handleHotelGuestLogout : handleLogout} 
            className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive/80"
          >
            {isHotelGuest ? 'End Session' : 'Log Out'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}