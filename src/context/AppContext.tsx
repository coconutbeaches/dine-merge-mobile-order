
import React, { createContext, useContext, ReactNode } from 'react';
import { Address, Order } from '../types/supabaseTypes';
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
  loginOrSignup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error: string | null; a_new_user_was_created: boolean; }>;


  // Cart related
  cart: any[];
  addToCart: (item: any, quantity: number, selectedOptions?: any) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
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
  // Auth-related context
  const { currentUser, isLoggedIn, isLoading, login, loginOrSignup } = useUserContext();

  // Customer context for admin operations
  const { adminCustomerContext, setAdminCustomerContext } = useAdminCustomerContext();

  // Shopping cart context
  const { cart, addToCart, removeFromCart, updateCartItemQuantity, cartTotal, clearCart } = useAppCart();

  // Orders: Use correct user (regular or admin-customer)
  const effectiveUserId = adminCustomerContext?.customerId || currentUser?.id;
  const { placeOrder, getOrderHistory } = useAppOrders(effectiveUserId, adminCustomerContext, currentUser);

  const value: AppContextType = {
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
    loginOrSignup,
    // Cart related
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    cartTotal,
    clearCart
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
