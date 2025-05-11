
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, CartItem, MenuItem, Order, OrderStatus, Address } from '../types';
import { mockUsers, menuItems, mockOrders } from '../data/mockData';

interface AppContextType {
  // User Management
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  mergeAccounts: (sourceUserId: string, targetUserId: string) => Promise<boolean>;
  
  // Cart Management
  cart: CartItem[];
  addToCart: (item: MenuItem, quantity: number, selectedOptions?: any, specialInstructions?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  
  // Order Management
  placeOrder: (address: Address, paymentMethod: string, tip?: number) => Promise<Order>;
  getOrderHistory: () => Order[];
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      setCart(JSON.parse(storedCart));
    }
    
    setIsLoading(false);
  }, []);
  
  // Save cart to localStorage when it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, isLoading]);
  
  // Save user to localStorage when it changes
  useEffect(() => {
    if (!isLoading && currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser, isLoading]);
  
  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => {
    return total + (item.menuItem.price * item.quantity);
  }, 0);
  
  // User Management Functions
  const login = async (email: string, password: string): Promise<boolean> => {
    // In a real app, we would call an API endpoint here
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // For demo purposes, we'll simulate a successful login if we find the user
    if (user) {
      // Add order history to the user
      const userWithOrders = {
        ...user,
        orderHistory: orders.filter(o => o.userId === user.id)
      };
      
      setCurrentUser(userWithOrders);
      return true;
    }
    return false;
  };
  
  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    // In a real app, we would call an API endpoint here
    // For demo purposes, we'll simulate creating a new user
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return false;
    }
    
    // Create new user
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      addresses: [],
      orderHistory: []
    };
    
    setCurrentUser(newUser);
    mockUsers.push(newUser);
    return true;
  };
  
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };
  
  const mergeAccounts = async (sourceUserId: string, targetUserId: string): Promise<boolean> => {
    // This would be handled by the backend in a real app
    // For demo purposes, we'll simulate merging two accounts
    
    const sourceUser = mockUsers.find(u => u.id === sourceUserId);
    const targetUser = mockUsers.find(u => u.id === targetUserId);
    
    if (!sourceUser || !targetUser) {
      return false;
    }
    
    // Merge order histories
    const sourceOrders = orders.filter(o => o.userId === sourceUserId);
    
    // Update orders to belong to target user
    sourceOrders.forEach(order => {
      order.userId = targetUserId;
    });
    
    // Update the orders state
    setOrders([...orders]);
    
    // Add source user's addresses to target user if they don't already exist
    sourceUser.addresses.forEach(address => {
      const addressExists = targetUser.addresses.some(a => a.id === address.id);
      if (!addressExists) {
        targetUser.addresses.push({...address, isDefault: false});
      }
    });
    
    // If current user is the source user, log them out
    if (currentUser && currentUser.id === sourceUserId) {
      logout();
      return true;
    }
    
    // If current user is the target user, refresh their data
    if (currentUser && currentUser.id === targetUserId) {
      setCurrentUser({
        ...targetUser,
        orderHistory: orders.filter(o => o.userId === targetUserId)
      });
    }
    
    return true;
  };
  
  // Cart Management Functions
  const addToCart = (
    item: MenuItem, 
    quantity: number, 
    selectedOptions?: any, 
    specialInstructions?: string
  ) => {
    const existingCartItemIndex = cart.findIndex(
      cartItem => cartItem.menuItem.id === item.id && 
        JSON.stringify(cartItem.selectedOptions) === JSON.stringify(selectedOptions)
    );
    
    if (existingCartItemIndex > -1) {
      // Update quantity if item with same options already exists
      const updatedCart = [...cart];
      updatedCart[existingCartItemIndex].quantity += quantity;
      setCart(updatedCart);
    } else {
      // Add new cart item
      setCart([
        ...cart,
        {
          menuItem: item,
          quantity,
          selectedOptions,
          specialInstructions
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
  const placeOrder = async (address: Address, paymentMethod: string, tip?: number): Promise<Order> => {
    if (!currentUser) {
      throw new Error('User must be logged in to place an order');
    }
    
    if (cart.length === 0) {
      throw new Error('Cart cannot be empty');
    }
    
    const newOrder: Order = {
      id: `order-${Date.now()}`,
      userId: currentUser.id,
      items: [...cart], // Create a copy of the cart
      status: OrderStatus.PENDING,
      total: cartTotal + (tip || 0),
      createdAt: new Date(),
      address,
      paymentMethod,
      tip
    };
    
    // Add order to orders list
    setOrders([newOrder, ...orders]);
    
    // Clear cart after order is placed
    clearCart();
    
    return newOrder;
  };
  
  const getOrderHistory = () => {
    if (!currentUser) {
      return [];
    }
    
    return orders.filter(order => order.userId === currentUser.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };
  
  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
    login,
    signup,
    logout,
    mergeAccounts,
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    cartTotal,
    placeOrder,
    getOrderHistory
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
