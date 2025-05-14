
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

const AdminMergeAccounts = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  // This is a placeholder function since we no longer have mergeAccounts in the context
  const handleMergeAccounts = () => {
    setError('Merge functionality is not implemented yet');
  };
  
  React.useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <Layout title="Merge Customer Accounts" showBackButton>
      <div className="p-4 max-w-lg mx-auto">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold mb-4">Select accounts to merge</h2>
            
            {isLoading ? (
              <p>Loading users...</p>
            ) : users.length === 0 ? (
              <p>No users found</p>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="flex items-center p-2 border rounded">
                    <input 
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => {
                        if (selectedUsers.includes(user.id)) {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        } else {
                          setSelectedUsers([...selectedUsers, user.id]);
                        }
                      }}
                      className="mr-3"
                    />
                    <label htmlFor={`user-${user.id}`} className="flex-1">
                      <p className="font-medium">{user.name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          onClick={handleMergeAccounts}
          disabled={selectedUsers.length < 2 || isLoading}
          className="w-full"
        >
          Merge Selected Accounts
        </Button>
      </div>
    </Layout>
  );
};

export default AdminMergeAccounts;
