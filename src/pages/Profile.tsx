
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { User, LogOut, History, MapPin, Settings } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAppContext();
  
  // Redirect to login if not logged in
  if (!currentUser) {
    navigate('/login');
    return null;
  }
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  return (
    <Layout title="My Profile" showBackButton>
      <div className="page-container">
        <Card className="mb-6">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-restaurant-primary/10 rounded-full w-20 h-20 flex items-center justify-center mb-2">
              <User className="h-10 w-10 text-restaurant-primary" />
            </div>
            <CardTitle>{currentUser.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start h-auto py-3 px-4"
            onClick={() => navigate('/order-history')}
          >
            <History className="h-5 w-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Order History</p>
              <p className="text-sm text-muted-foreground">View your past orders</p>
            </div>
          </Button>
          
          <Separator />
          
          <Button 
            variant="ghost" 
            className="w-full justify-start h-auto py-3 px-4"
            onClick={() => navigate('/addresses')}
          >
            <MapPin className="h-5 w-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Saved Addresses</p>
              <p className="text-sm text-muted-foreground">Manage your delivery addresses</p>
            </div>
          </Button>
          
          <Separator />
          
          <Button 
            variant="ghost" 
            className="w-full justify-start h-auto py-3 px-4"
            onClick={() => navigate('/account-settings')}
          >
            <Settings className="h-5 w-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">Account Settings</p>
              <p className="text-sm text-muted-foreground">Update your profile information</p>
            </div>
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
