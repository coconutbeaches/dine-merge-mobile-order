import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, CartItem, MenuItem, Order, OrderStatus, Address } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { Order as SupabaseOrder, OrderStatus as SupabaseOrderStatus, PaymentStatus as SupabasePaymentStatus, FulfillmentStatus as SupabaseFulfillmentStatus } from '@/types/supabaseTypes';

interface AppContextType {
  // User Management
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  
  // Cart Management
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number, selectedOptions?: any) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  
  // Order Management
  placeOrder: (address: Address, paymentMethod: string, tip?: number) => Promise<Order | null>;
  getOrderHistory: () => Order[];
  
  // Add isLoading to the context type
  isLoading: boolean;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize authentication state from Supabase
  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setSupabaseSession(session);
          setSupabaseUser(session.user);
          
          // Fetch additional user data from profiles table
          setTimeout(async () => {
            if (session.user?.id) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
        } else {
          setSupabaseSession(null);
          setSupabaseUser(null);
          setCurrentUser(null);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSupabaseSession(session);
        setSupabaseUser(session.user);
        
        if (session.user?.id) {
          fetchUserProfile(session.user.id);
        }
      }
      
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      if (data) {
        setCurrentUser({
          id: data.id,
          email: data.email,
          name: data.name || data.email.split('@')[0],
          phone: data.phone || "",
          addresses: [], // Assuming addresses are managed elsewhere or not used yet
          orderHistory: [] // Assuming order history is fetched separately or not used yet
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
    
    setIsLoading(false); // Ensure isLoading is set to false after cart is loaded
  }, []);
  
  // Save cart to localStorage when it changes
  useEffect(() => {
    if (!isLoading) { // Only save cart if not in initial loading state
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, isLoading]);
  
  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => {
    let itemPrice = item.menuItem.price;
    
    // Add option prices if there are any
    if (item.selectedOptions && item.menuItem.options) {
      item.menuItem.options.forEach(option => {
        if (option.multiSelect) {
          const selectedValues = item.selectedOptions?.[option.name] as string[] || [];
          selectedValues.forEach(value => {
            const choice = option.choices.find(c => c.name === value);
            if (choice) {
              itemPrice += choice.price;
            }
          });
        } else {
          const selectedValue = item.selectedOptions?.[option.name] as string;
          const choice = option.choices?.find(c => c.name === selectedValue);
          if (choice) {
            itemPrice += choice.price;
          }
        }
      });
    }
    
    return total + (itemPrice * item.quantity);
  }, 0);
  
  // User Management Functions
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Error signing in:', error);
        return false;
      }
      
      if (data.session) { // User successfully logged in
        clearCart(); // Clear cart on successful login
      }
      return true;
    } catch (error) {
      console.error('Unexpected error during login:', error);
      return false;
    }
  };
  
  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });
      
      if (error) {
        console.error('Error signing up:', error);
        return false;
      }
      
      // Optionally clear cart on signup as well, or leave as is
      // clearCart(); 
      return true;
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      return false;
    }
  };
  
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null); // Ensure currentUser is reset
      setSupabaseUser(null);
      setSupabaseSession(null);
      // Cart is persisted in localStorage, so it remains unless explicitly cleared on logout.
      // If you want to clear cart on logout:
      // clearCart(); 
      // localStorage.removeItem('currentUser'); // This was likely for a different auth system
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
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
  
  // Order Management Functions
  const placeOrder = async (address: Address, paymentMethod: string, tip?: number): Promise<Order | null> => {
    if (!currentUser) {
      console.error('User must be logged in to place an order');
      return null;
    }
    
    if (cart.length === 0) {
      console.error('Cart cannot be empty');
      return null;
    }

    const orderItemsForSupabase = cart.map(cartItem => ({
      menuItemId: cartItem.menuItem.id,
      name: cartItem.menuItem.name,
      quantity: cartItem.quantity,
      unitPrice: cartItem.menuItem.price, // This should be the base price
      selectedOptions: cartItem.selectedOptions || {},
    }));

    const orderPayload = {
      user_id: currentUser.id,
      customer_name: currentUser.name || currentUser.email,
      order_items: orderItemsForSupabase,
      total_amount: cartTotal + (tip || 0), // Ensure cartTotal reflects options prices correctly
      order_status: 'pending' as SupabaseOrderStatus,
      payment_status: 'unpaid' as SupabasePaymentStatus,
      fulfillment_status: 'unfulfilled' as SupabaseFulfillmentStatus,
    };

    try {
      const { data: insertedOrderData, error } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (error) {
        console.error('Error placing order in Supabase:', error);
        return null;
      }

      if (insertedOrderData) {
        const newOrderForLocalState: Order = {
          id: insertedOrderData.id.toString(),
          userId: insertedOrderData.user_id || currentUser.id,
          items: cart.map(ci => ({ // Map cart items, ensuring specialInstructions is not included
            menuItem: ci.menuItem,
            quantity: ci.quantity,
            selectedOptions: ci.selectedOptions,
          })),
          status: (insertedOrderData.order_status as OrderStatus) || OrderStatus.PENDING,
          total: insertedOrderData.total_amount,
          createdAt: new Date(insertedOrderData.created_at),
          address,
          paymentMethod,
          tip,
        };
        
        setOrders(prevOrders => [newOrderForLocalState, ...prevOrders]);
        clearCart();
        return newOrderForLocalState;
      }
      return null;

    } catch (error) {
      console.error('Unexpected error during placeOrder:', error);
      return null;
    }
  };
  
  const getOrderHistory = () => {
    if (!currentUser) {
      return [];
    }
    // This filters the local 'orders' state. If OrderHistory needs to fetch from DB, it should do so directly.
    return orders.filter(order => order.userId === currentUser.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };
  
  const value = {
    currentUser,
    isLoggedIn: !!currentUser && !!supabaseSession,
    login,
    signup,
    logout,
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    cartTotal,
    placeOrder,
    getOrderHistory,
    isLoading // Provide isLoading in the context value
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
