
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { mockUsers } from '@/data/mockData';
import { AlertCircle } from 'lucide-react';

const AdminMergeAccounts = () => {
  const navigate = useNavigate();
  const { mergeAccounts } = useAppContext();
  const { toast } = useToast();
  
  const [sourceUserId, setSourceUserId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleMergeAccounts = async () => {
    if (!sourceUserId || !targetUserId) {
      toast({
        title: "Error",
        description: "Please select both source and target accounts",
        variant: "destructive"
      });
      return;
    }
    
    if (sourceUserId === targetUserId) {
      toast({
        title: "Error",
        description: "Source and target accounts must be different",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await mergeAccounts(sourceUserId, targetUserId);
      
      if (success) {
        toast({
          title: "Success",
          description: "Accounts have been merged successfully"
        });
        navigate('/admin');
      } else {
        toast({
          title: "Error",
          description: "Failed to merge accounts",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout title="Merge Customer Accounts" showBackButton>
      <div className="page-container">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl">Merge Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              <div className="flex items-start mb-2">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-restaurant-primary" />
                <p>
                  Merging accounts will move order history and addresses from the source account to the target account.
                  The source account will remain in the system but will be disconnected from its orders.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="sourceAccount">Source Account (From)</Label>
                <div className="mt-1">
                  <select
                    id="sourceAccount"
                    value={sourceUserId}
                    onChange={(e) => setSourceUserId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select account</option>
                    {mockUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="relative flex items-center justify-center">
                <div className="border-t border-gray-300 w-full"></div>
                <span className="bg-white px-2 text-xs text-muted-foreground">MERGE INTO</span>
              </div>
              
              <div>
                <Label htmlFor="targetAccount">Target Account (To)</Label>
                <div className="mt-1">
                  <select
                    id="targetAccount"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select account</option>
                    {mockUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <Button
                onClick={handleMergeAccounts}
                className="w-full bg-restaurant-primary hover:bg-restaurant-primary/90 mt-4"
                disabled={isLoading}
              >
                {isLoading ? "Merging..." : "Merge Accounts"}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">What happens when accounts are merged?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <span className="font-semibold">Order History:</span> All orders from the source account will appear in the target account's order history.
            </p>
            <p>
              <span className="font-semibold">Addresses:</span> All delivery addresses from the source account will be added to the target account (as non-default addresses).
            </p>
            <p>
              <span className="font-semibold">Payment Methods:</span> In a real application, any saved payment methods would also be transferred (not implemented in this demo).
            </p>
            <p>
              <span className="font-semibold">Source Account:</span> The source account will remain in the system but will be disconnected from its orders and addresses.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminMergeAccounts;
