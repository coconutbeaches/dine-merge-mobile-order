
import React, { ReactNode } from 'react';
import { AppProvider } from './AppContext';
import { CartProvider } from './CartContext';
import { UserProvider } from './UserContext';
import { OrderProvider } from './OrderContext';

interface AppContextProviderProps {
  children: ReactNode;
}

const AppContextProvider = ({ children }: AppContextProviderProps) => {
  return (
    <UserProvider>
      <CartProvider>
        <OrderProvider>
          <AppProvider>{children}</AppProvider>
        </OrderProvider>
      </CartProvider>
    </UserProvider>
  );
};

export default AppContextProvider;
