
import React, { createContext, useContext, ReactNode } from 'react';
import { Order, Address } from '../types/supabaseTypes';
import { useUserContext } from './UserContext';
import { useOrders } from '@/hooks/useOrders';
import { useCartContext } from './CartContext';

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
  const { cart, addToCart, removeFromCart, updateCartItemQuantity, cartTotal } = useCartContext();
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
    // Order related
    placeOrder: handlePlaceOrder,
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
