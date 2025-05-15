
import { Database } from "../integrations/supabase/types";

// Re-export the enums for convenience
export type OrderStatus = 'new' | 'confirmed' | 'make' | 'ready' | 'delivered' | 'paid' | 'cancelled';
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type FulfillmentStatus = Database["public"]["Enums"]["fulfillment_status"];

// Create type for order with optional fields
export interface Order extends Omit<Tables<"orders">, 'order_status'> {
  customer_name: string | null;
  order_items: any | null;
  order_status: OrderStatus | null;
  payment_status: PaymentStatus | null;
  fulfillment_status: FulfillmentStatus | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
  id: number;
  user_id: string | null;
  table_number: string;
  tip?: number;
}

// Type for Profile
export interface Profile extends Tables<"profiles"> {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  role: string | null;
}

// Type for Product
export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  options?: ProductOption[];
}

// Type for Product Option - Updated to handle string type from database
export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  required: boolean;
  enable_quantity: boolean;
  selection_type: "single" | "multiple" | string;
  choices: ProductOptionChoice[];
  sort_order: number;
}

// Type for Product Option Choice
export interface ProductOptionChoice {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  sort_order: number;
}

// Helper type to get row types from tables
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
