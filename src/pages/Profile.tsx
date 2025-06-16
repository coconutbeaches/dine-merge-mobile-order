import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useUserContext } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { updateUserProfile } from '@/services/userProfileService';

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, isLoggedIn, isLoading: isLoadingUserContext, logout } = useUserContext(); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // This is for page-specific loading like profile updates

  useEffect(() => {
    if (!isLoadingUserContext && !isLoggedIn) {
      navigate('/login', { state: { returnTo: '/profile' } });
    }
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || ''); 
    }
  }, [currentUser, isLoggedIn, isLoadingUserContext, navigate]);

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
      await updateUserProfile({
        id: currentUser.id,
        name: name,
        phone: phone,
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
    navigate('/');
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
        <div className="mt-6 text-center space-y-3"> {/* Added space-y-3 for button spacing */}
          <Button onClick={() => navigate('/order-history')} className="w-full sm:w-auto">My Orders</Button>
          
          {currentUser?.role === 'admin' && (
            <Link to="/admin" className="block sm:inline-block sm:ml-3">
              <Button variant="outline" className="w-full sm:w-auto">Admin Dashboard</Button>
            </Link>
          )}
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
