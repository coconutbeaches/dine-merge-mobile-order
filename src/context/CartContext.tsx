import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, MenuItem } from '../types';
import { useUserContext } from './UserContext';
import { calculateTotalPrice } from '@/utils/productUtils';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number, selectedOptions?: any) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { isLoading: userIsLoading, isLoggedIn } = useUserContext();

  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  // Listen for user login/logout to clear cart
  useEffect(() => {
    if (isLoggedIn) {
      // Clear cart when user logs in
      clearCart();
    }
  }, [isLoggedIn]);
  
  // Save cart to localStorage when it changes
  useEffect(() => {
    if (!userIsLoading) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, userIsLoading]);
  
  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => {
    const itemTotal = calculateTotalPrice(item.menuItem, item.selectedOptions || {});
    return total + (itemTotal * item.quantity);
  }, 0);
  
  // Cart Management Functions
  const addToCart = (
    item: MenuItem, 
    quantity: number, 
    selectedOptions?: any
  ) => {
    const existingCartItemIndex = cart.findIndex(
      cartItem => cartItem.menuItem.id === item.id && 
        JSON.stringify(cartItem.selectedOptions) === JSON.stringify(selectedOptions)
    );
    
    if (existingCartItemIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingCartItemIndex].quantity += quantity;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          menuItem: item,
          quantity,
          selectedOptions
        }
      ]);
    }
  };
  
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.menuItem.id !== itemId));
  };
  
  const updateCartItemQuantity = (itemId: string, quantity: number) => {
    setCart(cart.map(item => {
      if (item.menuItem.id === itemId) {
        return { ...item, quantity };
      }
      return item;
    }));
  };
  
  const clearCart = () => {
    setCart([]);
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    cartTotal
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
