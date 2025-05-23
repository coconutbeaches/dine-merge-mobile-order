import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Import CartItem, MenuItem, and the canonical SelectedOptionsType from ../types
import { CartItem, MenuItem, SelectedOptionsType } from '../types'; 
import { useUserContext } from './UserContext';
// Remove the import from '../services/orderService' as SelectedOptionsType is now from '../types'

interface CartContextType {
  cart: CartItem[]; // CartItem now uses SelectedOptionsType from ../types
  addToCart: (item: MenuItem, quantity: number, selectedOptions?: SelectedOptionsType) => void;
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

  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      clearCart();
    }
  }, [isLoggedIn]);
  
  useEffect(() => {
    if (!userIsLoading) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, userIsLoading]);
  
  const cartTotal = cart.reduce((total, item) => {
    let itemPrice = item.menuItem.price;
    
    if (item.selectedOptions && item.menuItem.options) {
      // item.selectedOptions is now correctly typed via CartItem from ../types
      const currentItemOptions = item.selectedOptions; 
      item.menuItem.options.forEach(option => {
        if (option.multiSelect) {
          const selectedValues = currentItemOptions?.[option.name] as string[] || [];
          selectedValues.forEach(value => {
            const choice = option.choices.find(c => c.name === value);
            if (choice) {
              itemPrice += choice.price;
            }
          });
        } else {
          const selectedValue = currentItemOptions?.[option.name] as string;
          const choice = option.choices?.find(c => c.name === selectedValue);
          if (choice) {
            itemPrice += choice.price;
          }
        }
      });
    }
    
    return total + (itemPrice * item.quantity);
  }, 0);
  
  const addToCart = (
    item: MenuItem, 
    quantity: number, 
    selectedOptions?: SelectedOptionsType 
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
      // CartItem.selectedOptions from ../types is now SelectedOptionsType, so this is type-consistent
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
