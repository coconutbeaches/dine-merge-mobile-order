'use client';

import { useAppContext } from '@/context/AppContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
  const { currentUser, isLoading, isLoggedIn } = useAppContext();
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [localStorageInfo, setLocalStorageInfo] = useState<any>(null);

  useEffect(() => {
    // Get session info
    const getSessionInfo = async () => {
      const { data, error } = await supabase.auth.getSession();
      setSessionInfo({ data, error });
    };
    
    getSessionInfo();
    
    // Get localStorage info
    if (typeof window !== 'undefined') {
      const storageInfo: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('supabase')) {
          storageInfo[key] = localStorage.getItem(key);
        }
      }
      setLocalStorageInfo(storageInfo);
    }
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">App Context State</h2>
          <pre className="text-sm">
            {JSON.stringify({
              currentUser,
              isLoading,
              isLoggedIn
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Supabase Session</h2>
          <pre className="text-sm">
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Local Storage (Supabase keys)</h2>
          <pre className="text-sm">
            {JSON.stringify(localStorageInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
