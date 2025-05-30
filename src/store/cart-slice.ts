import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from './store';

// Types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  lastUpdated: number;
}

// Helper functions
const calculateTotals = (items: CartItem[]) => {
  return items.reduce(
    (acc, item) => {
      const itemTotal = item.price * item.quantity;
      return {
        totalItems: acc.totalItems + item.quantity,
        totalAmount: acc.totalAmount + itemTotal,
      };
    },
    { totalItems: 0, totalAmount: 0 }
  );
};

// Load cart from localStorage if available
const loadCartFromStorage = (): CartState => {
  if (typeof window === 'undefined') {
    return { items: [], isOpen: false, lastUpdated: Date.now() };
  }
  
  try {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      return JSON.parse(savedCart);
    }
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error);
  }
  
  return { items: [], isOpen: false, lastUpdated: Date.now() };
};

// Initial state
const initialState: CartState = loadCartFromStorage();

// Create slice
export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Add item to cart (or increase quantity if already exists)
    addItem: (state, action: PayloadAction<CartItem>) => {
      const { id, name, price, quantity = 1, image } = action.payload;
      const existingItem = state.items.find(item => item.id === id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({ id, name, price, quantity, image });
      }
      
      state.lastUpdated = Date.now();
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(state));
      }
    },
    
    // Remove item from cart
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item.id !== action.payload);
      state.lastUpdated = Date.now();
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(state));
      }
    },
    
    // Update item quantity
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id);
      
      if (item) {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          state.items = state.items.filter(item => item.id !== id);
        } else {
          item.quantity = quantity;
        }
        
        state.lastUpdated = Date.now();
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('cart', JSON.stringify(state));
        }
      }
    },
    
    // Clear entire cart
    clearCart: (state) => {
      state.items = [];
      state.lastUpdated = Date.now();
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart', JSON.stringify(state));
      }
    },
    
    // Toggle cart visibility
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    
    // Open cart
    openCart: (state) => {
      state.isOpen = true;
    },
    
    // Close cart
    closeCart: (state) => {
      state.isOpen = false;
    },
  },
});

// Export actions
export const {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  toggleCart,
  openCart,
  closeCart,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartIsOpen = (state: RootState) => state.cart.isOpen;
export const selectCartItemCount = (state: RootState) => 
  calculateTotals(state.cart.items).totalItems;
export const selectCartTotal = (state: RootState) => 
  calculateTotals(state.cart.items).totalAmount;
export const selectCartItemById = (state: RootState, id: string) => 
  state.cart.items.find(item => item.id === id);
export const selectLastUpdated = (state: RootState) => state.cart.lastUpdated;

// Format price in Thai Baht
export const formatPrice = (price: number): string => {
  return `฿${price.toFixed(2)}`;
};

export default cartSlice.reducer;
