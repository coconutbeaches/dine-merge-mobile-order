
import React, { createContext, useContext, ReactNode } from 'react';
import { Order, Address } from '../types/supabaseTypes';
import { useUserContext } from './UserContext';
import { useOrders } from '@/hooks/useOrders';

interface AdminCustomerContext {
  customerId: string;
  customerName: string;
}

interface AppContextType {
  placeOrder: (address: Address | null, paymentMethod: string, tableNumber?: string) => Promise<Order | null>;
  getOrderHistory: () => Order[];
  adminCustomerContext: AdminCustomerContext | null;
  setAdminCustomerContext: (context: AdminCustomerContext | null) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
  currentUser: any;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const { currentUser, isLoggedIn, isLoading } = useUserContext();
  const [adminCustomerContext, setAdminCustomerContext] = React.useState<AdminCustomerContext | null>(null);
  
  // Use admin customer ID if available, otherwise use current user ID
  const effectiveUserId = adminCustomerContext?.customerId || currentUser?.id;
  const { placeOrder, getOrderHistory } = useOrders(effectiveUserId);

  // Enhanced order placement function with admin customer context
  const handlePlaceOrder = async (
    address: Address | null, 
    paymentMethod: string, 
    tableNumber?: string
  ): Promise<Order | null> => {
    try {
      console.log("AppContext: Placing order with:", { 
        effectiveUserId,
        adminContext: adminCustomerContext,
        currentUserId: currentUser?.id,
        address, 
        paymentMethod, 
        tableNumber
      });
      
      if (!effectiveUserId) {
        console.error("AppContext: No user ID available for order placement");
        return null;
      }
      
      const result = await placeOrder(address, paymentMethod, tableNumber);
      console.log("AppContext: Order placement result:", result);
      return result;
    } catch (error) {
      console.error("AppContext: Error placing order:", error);
      return null;
    }
  };

  const value = {
    placeOrder: handlePlaceOrder,
    getOrderHistory,
    adminCustomerContext,
    setAdminCustomerContext,
    isLoggedIn,
    isLoading,
    currentUser
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
