import React, { createContext, useContext, ReactNode } from 'react';
import { Order, Address } from '../types/supabaseTypes';
import { useUserContext } from './UserContext';
import { useAppCart } from '@/hooks/useAppCart';
import { useAdminCustomerContext } from '@/hooks/useAdminCustomerContext';
import { useAppOrders } from '@/hooks/useAppOrders';

interface AdminCustomerContext {
  customerId: string;
  customerName: string;
}

interface AppContextType {
  // Order related
  placeOrder: (address: Address | null, paymentMethod: string, tableNumber?: string) => Promise<Order | null>;
  getOrderHistory: () => Order[];
  adminCustomerContext: AdminCustomerContext | null;
  setAdminCustomerContext: (context: AdminCustomerContext | null) => void;
  
  // Auth related
  isLoggedIn: boolean;
  isLoading: boolean;
  currentUser: any;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  
  // Cart related (from CartContext)
  cart: any[];
  addToCart: (item: any, quantity: number, selectedOptions?: any) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  cartTotal: number;
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
  const { currentUser, isLoggedIn, isLoading, login, signup } = useUserContext();

  // Admin customer context
  const { adminCustomerContext, setAdminCustomerContext } = useAdminCustomerContext();

  // Cart logic
  const { cart, addToCart, removeFromCart, updateCartItemQuantity, cartTotal } = useAppCart();

  // Order logic
  const effectiveUserId = adminCustomerContext?.customerId || currentUser?.id;
  const { placeOrder, getOrderHistory } = useAppOrders(effectiveUserId, adminCustomerContext, currentUser);

  const value = {
    // Order related
    placeOrder,
    getOrderHistory,
    adminCustomerContext,
    setAdminCustomerContext,
    
    // Auth related
    isLoggedIn,
    isLoading,
    currentUser,
    login,
    signup,
    
    // Cart related
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    cartTotal
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
