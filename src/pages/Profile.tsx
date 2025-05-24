
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, isLoggedIn, isLoading: isLoadingAppContext, logout } = useAppContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingAppContext && !isLoggedIn) {
      navigate('/login', { state: { returnTo: '/profile' } });
    }
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      // Assuming phone is directly on currentUser, or fetched via profiles
      // For now, let's fetch it from profiles table
      fetchProfileDetails();
    }
  }, [currentUser, isLoggedIn, isLoadingAppContext, navigate]);

  const fetchProfileDetails = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', currentUser.id)
        .single();
      if (error && error.code !== 'PGRST116') { // PGRST116: 0 rows found (expected)
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
      // Update name in auth.users.user_metadata if needed (more complex, usually handled at signup/profile specific endpoint)
      // For now, we update the 'profiles' table
      const { error } = await supabase
        .from('profiles')
        .update({ name, phone }) // Only update name and phone here
        .eq('id', currentUser.id);

      if (error) throw error;

      // Note: Email updates usually require verification and are handled separately by Supabase Auth.
      // If you need to update email, use supabase.auth.updateUser({ email: newEmail })
      // For this example, we are not updating email directly.

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      // Potentially re-fetch currentUser or update context if name change affects AppContext's currentUser display
      // For simplicity, local state change and toast are shown.
    } catch (error: any) {
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (isLoadingAppContext || (!currentUser && isLoggedIn)) {
    return (
      <Layout title="My Profile" showBackButton>
        <div className="page-container text-center py-10">Loading profile...</div>
      </Layout>
    );
  }

  if (!isLoggedIn || !currentUser) {
     // Should have been redirected by useEffect, but as a fallback
    return (
      <Layout title="My Profile" showBackButton>
        <div className="page-container text-center py-10">Please log in to view your profile.</div>
      </Layout>
    );
  }

  return (
    <Layout title="My Profile" showBackButton>
      <div className="page-container max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
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
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  disabled // Email typically not changed here directly
                />
                <p className="text-xs text-muted-foreground mt-1">Email address cannot be changed here.</p>
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
            <CardFooter className="flex justify-between items-center pt-6">
              {isEditing ? (
                <>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => {setIsEditing(false); fetchProfileDetails(); /* Reset changes */}}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </CardFooter>
          </form>
        </Card>

        {/* Removed Saved Addresses section as per Photo 7 */}

        {/* Suggested placement for "My Orders" button */}
        <div className="mt-4 text-center"> {/* Adjust margin as needed */}
          <Button onClick={() => navigate('/order-history')}>My Orders</Button>
        </div>

        <div className="mt-8 text-center">
          <Button variant="link" onClick={handleLogout} className="text-destructive hover:text-destructive/80">
            Log Out
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
