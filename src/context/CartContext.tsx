
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, MenuItem } from '../types';
import { useUserContext } from './UserContext';
import { calculateTotalPrice } from '@/utils/productUtils';
import { nanoid } from 'nanoid';
import { debounce } from 'lodash';
import { backupCartToSupabase, loadCartFromBackup } from '@/lib/cartService';
import { getGuestSession, hasGuestSession } from '@/utils/guestSession';

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

  // Create a debounced backup function
  const debouncedBackupCart = debounce((guestId: string, cartData: CartItem[]) => {
    backupCartToSupabase(guestId, cartData);
  }, 300);

useEffect(() => {
  (async () => {
    try {
      const stored = localStorage.getItem('cart');
      if (stored) {
        try { setCart(JSON.parse(stored)); }
        catch { 
          try {
            localStorage.removeItem('cart'); 
          } catch (e) {
            console.warn('[Cart] localStorage not available for cleanup:', e);
          }
        }
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.warn('[Cart] localStorage not available for reading:', e);
    }

    // No localStorage or localStorage failed, attempt Supabase backup
    const guestId = getGuestSession()?.guest_user_id;
    if (guestId) {
      const backup = await loadCartFromBackup(guestId);
      setCart(backup);
    }
    setIsLoading(false);
  })();
}, []);

useEffect(() => {
  if (userIsLoading || isLoading) return;
  const json = JSON.stringify(cart);
  
  // Try to save to localStorage, but don't fail if it's not available
  try {
    if (json !== localStorage.getItem('cart')) {
      localStorage.setItem('cart', json);
    }
  } catch (e) {
    console.warn('[Cart] localStorage not available for writing:', e);
  }
  
  // Always try to backup to Supabase when guest session exists
  if (hasGuestSession()) {
    const guestId = getGuestSession()?.guest_user_id;
    if (guestId) {
      debouncedBackupCart(guestId, cart);
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
