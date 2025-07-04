"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useCartContext } from './CartContext';
import { useUserContext } from './UserContext';
import { useAppOrders } from '@/hooks/useAppOrders';
import { useAdminCustomerContext } from '@/hooks/useAdminCustomerContext';

/**
 * Aggregate application context values for cart, user, admin-customer, and orders.
 */
function useAppContextValue() {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    cartTotal,
  } = useCartContext();
  const {
    currentUser,
    isLoggedIn,
    isLoading,
    login,
    logout,
    updateUser,
    loginOrSignup,
  } = useUserContext();
  const {
    adminCustomerContext,
    setAdminCustomerContext,
  } = useAdminCustomerContext();
  const { placeOrder, getOrderHistory } = useAppOrders(
    currentUser?.id,
    adminCustomerContext,
    currentUser
  );

  return {
    // Cart operations
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    cartTotal,
    // User operations
    currentUser,
    isLoggedIn,
    isLoading,
    login,
    logout,
    updateUser,
    loginOrSignup,
    // Admin customer context
    adminCustomerContext,
    setAdminCustomerContext,
    // Order operations
    placeOrder,
    getOrderHistory,
  };
}

type AppContextType = ReturnType<typeof useAppContextValue>;

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const value = useAppContextValue();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

/**
 * Hook to access the aggregated app context.
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
