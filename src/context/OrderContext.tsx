
import React, { createContext, useContext, ReactNode } from 'react';
import { Order, Address } from '../types';
import { useUserContext } from './UserContext';
import { useOrders } from '@/hooks/useOrders';

interface OrderContextType {
  placeOrder: (address: Address | null, paymentMethod: string, tableNumber?: string, tip?: number) => Promise<Order | null>;
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

  const value = {
    placeOrder,
    getOrderHistory
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};
