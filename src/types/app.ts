import { Database, Tables } from './supabaseTypes';

// Base Supabase types
export type Order = Tables<'orders'>;
export type Product = Tables<'products'>;
export type Profile = Tables<'profiles'>;
export type Category = Tables<'categories'>;

// Enums
export type OrderStatus =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'paid'
  | 'cancelled';

export type SupabaseOrderStatus = OrderStatus;

// JSON column types
// This is a simplified representation of what's stored in the order_items JSON column.
// It's based on the structure used in useFetchOrderById.ts and other parts of the app.
export interface CartItem {
  id: string; // This is the cart item's unique ID, not the product ID
  quantity: number;
  menuItem: Product;
  selectedOptions: {
    [optionId: string]: {
      name: string;
      price: number;
      quantity?: number;
    };
  };
  totalPrice: number;
}
