
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mockUsers } from '@/data/mockData';
import { UserSearch, Settings, ArrowRight, LayoutList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Admin = () => {
  const navigate = useNavigate();
  
  // Add admin role to super admin account if needed
  useEffect(() => {
    const setupAdminRole = async () => {
      // Get the user id for the admin email
      const { data: adminUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'hello@coconutbeachkohphangan.com')
        .single();
        
      if (adminUser) {
        // Update the role to admin if not already set
        const { error } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', adminUser.id);
          
        if (error) {
          console.error('Error updating admin role:', error);
        }
      }
    };
    
    setupAdminRole();
  }, []);
  
  return (
    <Layout title="Restaurant Admin" showBackButton>
      <div className="page-container">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl">Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Welcome to the restaurant admin panel. Manage your restaurant settings, orders, and customer accounts here.
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <Button 
                variant="outline" 
                className="flex justify-between items-center"
                onClick={() => navigate('/categories-manager')}
              >
                <div className="flex items-center">
                  <LayoutList className="h-4 w-4 mr-2" />
                  <span>Manage Categories</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                className="flex justify-between items-center"
                onClick={() => navigate('/admin/merge-accounts')}
              >
                <div className="flex items-center">
                  <UserSearch className="h-4 w-4 mr-2" />
                  <span>Merge Customer Accounts</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline" 
                className="flex justify-between items-center"
              >
                <div className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Restaurant Settings</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Registered Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockUsers.map(user => (
                <div key={user.id} className="flex justify-between items-center p-3 rounded-md border">
                  <div>
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate(`/admin/user/${user.id}`)}
                    className="text-muted-foreground"
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Admin;
