import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { useUserContext } from '@/context/UserContext';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { updateUserProfile } from '@/services/userProfileService';

const Profile = () => {
  const router = useRouter();
  const { currentUser, isLoggedIn, isLoading: isLoadingUserContext, logout } = useUserContext(); 
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // This is for page-specific loading like profile updates

  useEffect(() => {
    if (!isLoadingUserContext && !isLoggedIn) {
      router.push('/login');
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
    router.push('/');
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
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

        {/* Removed Saved Addresses section as per Photo 7 */}

        {/* Suggested placement for "My Orders" button */}
        <div className="mt-6 text-center space-y-3"> {/* Added space-y-3 for button spacing */}
          <Button onClick={() => router.push('/order-history')} className="w-full sm:w-auto">My Orders</Button>
          
          {currentUser?.role === 'admin' && (
            <Link href="/admin" className="block sm:inline-block sm:ml-3">
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
