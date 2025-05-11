
import { Database } from "../integrations/supabase/types";

// Re-export the enums for convenience
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type FulfillmentStatus = Database["public"]["Enums"]["fulfillment_status"];

// Create type for order with optional fields
export interface Order extends Tables<"orders"> {
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
}

// Type for Profile
export interface Profile extends Tables<"profiles"> {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
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
  options: ProductOption[] | null;
}

// Type for Product Option
export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  required: boolean;
  enable_quantity: boolean;
  selection_type: "single" | "multiple";
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
type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
