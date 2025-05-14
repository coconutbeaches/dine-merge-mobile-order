
import React, { createContext, useContext, ReactNode } from 'react';
import { useUserContext } from './UserContext';
import { useCartContext } from './CartContext';
import { useOrderContext } from './OrderContext';

interface AppContextType {
  // User Management
  currentUser: ReturnType<typeof useUserContext>['currentUser'];
  isLoggedIn: ReturnType<typeof useUserContext>['isLoggedIn'];
  login: ReturnType<typeof useUserContext>['login'];
  signup: ReturnType<typeof useUserContext>['signup'];
  logout: ReturnType<typeof useUserContext>['logout'];
  
  // Cart Management
  cart: ReturnType<typeof useCartContext>['cart'];
  addToCart: ReturnType<typeof useCartContext>['addToCart'];
  removeFromCart: ReturnType<typeof useCartContext>['removeFromCart'];
  updateCartItemQuantity: ReturnType<typeof useCartContext>['updateCartItemQuantity'];
  clearCart: ReturnType<typeof useCartContext>['clearCart'];
  cartTotal: ReturnType<typeof useCartContext>['cartTotal'];
  
  // Order Management
  placeOrder: ReturnType<typeof useOrderContext>['placeOrder'];
  getOrderHistory: ReturnType<typeof useOrderContext>['getOrderHistory'];
  
  // Loading state
  isLoading: ReturnType<typeof useUserContext>['isLoading'];
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
  const userContext = useUserContext();
  const cartContext = useCartContext();
  const orderContext = useOrderContext();

  const value: AppContextType = {
    // User Management
    currentUser: userContext.currentUser,
    isLoggedIn: userContext.isLoggedIn,
    login: userContext.login,
    signup: userContext.signup,
    logout: userContext.logout,
    
    // Cart Management
    cart: cartContext.cart,
    addToCart: cartContext.addToCart,
    removeFromCart: cartContext.removeFromCart,
    updateCartItemQuantity: cartContext.updateCartItemQuantity,
    clearCart: cartContext.clearCart,
    cartTotal: cartContext.cartTotal,
    
    // Order Management
    placeOrder: orderContext.placeOrder,
    getOrderHistory: orderContext.getOrderHistory,
    
    // Loading state
    isLoading: userContext.isLoading
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
