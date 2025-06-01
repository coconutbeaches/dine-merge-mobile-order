
import React, { createContext, useContext, ReactNode } from 'react';
import { Order, Address } from '../types/supabaseTypes'; // Use supabaseTypes Order
import { useUserContext } from './UserContext';
import { useOrders } from '@/hooks/useOrders';

interface OrderContextType {
  placeOrder: (address: Address | null, paymentMethod: string, tableNumber?: string) => Promise<Order | null>;
  getOrderHistory: () => Order[];
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider = ({ children }: OrderProviderProps) => {
  const { currentUser } = useUserContext();
  const { placeOrder, getOrderHistory } = useOrders(currentUser?.id);

  // Enhanced order placement function with better error handling
  const handlePlaceOrder = async (
    address: Address | null, 
    paymentMethod: string, 
    tableNumber?: string
  ): Promise<Order | null> => {
    try {
      console.log("OrderContext: Placing order with:", { 
        userId: currentUser?.id,
        address, 
        paymentMethod, 
        tableNumber
      });
      
      if (!currentUser?.id) {
        console.error("OrderContext: No user ID available for order placement");
        return null;
      }
      
      const result = await placeOrder(address, paymentMethod, tableNumber);
      console.log("OrderContext: Order placement result:", result);
      return result;
    } catch (error) {
      console.error("OrderContext: Error placing order:", error);
      return null;
    }
  };

  const value = {
    placeOrder: handlePlaceOrder,
    getOrderHistory
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};
