
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, MenuItem } from '../types';
import { useUserContext } from './UserContext';
import { calculateTotalPrice } from '@/utils/productUtils';
import { nanoid } from 'nanoid';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number, selectedOptions?: any) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const { isLoading: userIsLoading } = useUserContext();

// Load cart from localStorage once on mount, delayed to avoid blocking main thread
useEffect(() => {
  setTimeout(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (error) {
        console.error('Error parsing cart from localStorage:', error);
        localStorage.removeItem('cart');
      }
    }
    setIsLoading(false);
  }, 0);
}, []);

// Save cart to localStorage only when necessary
useEffect(() => {
  if (!userIsLoading && !isLoading) {
    const currentCartString = JSON.stringify(cart);
    if (currentCartString !== localStorage.getItem('cart')) {
      localStorage.setItem('cart', currentCartString);
    }
  }
}, [cart, userIsLoading, isLoading]);
  
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
          id: nanoid(),
          menuItem: item,
          quantity,
          selectedOptions
        }
      ]);
    }
  };
  
  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter(item => item.id !== cartItemId));
  };
  
  const updateCartItemQuantity = (cartItemId: string, quantity: number) => {
    setCart(cart.map(item => {
      if (item.id === cartItemId) {
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
    cartTotal,
    isLoading
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
