
import React, { ReactNode } from 'react';
import { AppProvider } from './AppContext';
import { CartProvider } from './CartContext';
import { UserProvider } from './UserContext';
import { OrderProvider } from './OrderContext';
import { GuestProvider } from './GuestContext';

interface AppContextProviderProps {
  children: ReactNode;
}

const AppContextProvider = ({ children }: AppContextProviderProps) => {
  return (
    <UserProvider>
      <CartProvider>
        <OrderProvider>
          <GuestProvider>
            <AppProvider>{children}</AppProvider>
          </GuestProvider>
        </OrderProvider>
      </CartProvider>
    </UserProvider>
  );
};

export default AppContextProvider;
