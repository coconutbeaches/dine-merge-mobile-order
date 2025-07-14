'use client';

import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';

export default function DebugAdminAuth() {
  const { currentUser, isLoggedIn, authReady } = useAppContext();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkClientSession = async () => {
    setLoading(true);
    console.log(`[Debug] ${Date.now()} - Checking client session...`);
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log(`[Debug] ${Date.now()} - Client session result:`, { session, error });
    
    setSessionInfo({
      session,
      error,
      timestamp: Date.now()
    });
    setLoading(false);
  };

  const testAdminNavigation = () => {
    const testStartTime = Date.now();
    console.log(`[Debug] ${testStartTime} - Testing admin navigation...`);
    console.log(`[Debug] ${testStartTime} - Current user:`, currentUser);
    console.log(`[Debug] ${testStartTime} - Is logged in:`, isLoggedIn);
    console.log(`[Debug] ${testStartTime} - Auth ready:`, authReady);
    
    window.location.href = '/admin';
  };

  return (
    <Layout title="Debug Admin Auth" showBackButton>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Current Auth State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Auth Ready:</strong> {authReady ? 'Yes' : 'No'}</p>
              <p><strong>Is Logged In:</strong> {isLoggedIn ? 'Yes' : 'No'}</p>
              <p><strong>Current User:</strong> {currentUser ? JSON.stringify(currentUser, null, 2) : 'null'}</p>
              <p><strong>User Role:</strong> {currentUser?.role || 'None'}</p>
              <p><strong>Is Admin:</strong> {currentUser?.role === 'admin' ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Session Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={checkClientSession} disabled={loading}>
                {loading ? 'Checking...' : 'Check Client Session'}
              </Button>
              
              {sessionInfo && (
                <div className="bg-gray-100 p-4 rounded">
                  <h4 className="font-semibold mb-2">Session Info (Client-side):</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(sessionInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Navigation Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Click this button to test navigation to /admin and check console logs:</p>
              <Button onClick={testAdminNavigation} variant="outline">
                Test Admin Navigation
              </Button>
              <p className="text-sm text-gray-600">
                This will navigate to /admin and trigger the server-side verifyAdminRole function.
                Check the console logs to see the detailed flow.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
