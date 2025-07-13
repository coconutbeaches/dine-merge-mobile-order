'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import AppContextProvider from '@/context/AppContextProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import AuthRedirect from '@/components/AuthRedirect';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale times for different data types
        staleTime: 5 * 60 * 1000, // 5 minutes default
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Only set up persistence on client side
    if (typeof window !== 'undefined') {
      const localStoragePersister = createSyncStoragePersister({
        storage: window.localStorage,
      });

      persistQueryClient({
        queryClient,
        persister: localStoragePersister,
        // Only persist customer and product queries
        queryKeyWhitelist: ['customers', 'products', 'product'],
      });
    }
  }, [queryClient]);

  if (!isClient) {
    return null; // Prevent hydration mismatch
  }

  return (
    ThemeProvider attribute="class"
      QueryClientProvider client={queryClient}
        AppContextProvider
          TooltipProvider
            Toaster /
            SonnerToaster /
            {children}
          /TooltipProvider
        /AppContextProvider
      /QueryClientProvider
    /ThemeProvider
  );
}
