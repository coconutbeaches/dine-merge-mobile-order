
import React, { ReactNode, useEffect } from 'react';
import { AppProvider } from './AppContext';
import { CartProvider } from './CartContext';
import { UserProvider } from './UserContext';
import { OrderProvider } from './OrderContext';
import { GuestProvider } from './GuestContext';
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper';
import { cleanupAllChannels } from '@/utils/supabaseChannelCleanup';
import { realtimeMonitoring } from '@/services/realtimeMonitoring'; // Initializes realtime monitoring automatically

interface AppContextProviderProps {
  children: ReactNode;
}

const AppContextProvider = ({ children }: AppContextProviderProps) => {
  useEffect(() => {
    // Set up beforeunload event listener to clean up all Supabase channels
    // This prevents orphaned sockets during hot-reload or tab closing
    const handleBeforeUnload = () => {
      console.log('[AppContextProvider] beforeunload event triggered, cleaning up all channels');
      cleanupAllChannels();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, []);

  return (
    <UserProvider>
      <CartProvider>
        <OrderProvider>
          <GuestProvider>
            <AppProvider>
              <ClientOnlyWrapper>{children}</ClientOnlyWrapper>
            </AppProvider>
          </GuestProvider>
        </OrderProvider>
      </CartProvider>
    </UserProvider>
  );
};

export default AppContextProvider;
