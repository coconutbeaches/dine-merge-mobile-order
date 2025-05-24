
import { Json } from '@/integrations/supabase/types';

// Add the table_number to the Order type
export interface Order {
  id: number;
  user_id?: string;
  customer_name?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  order_status: OrderStatus;
  order_items?: any;
  table_number?: string;
  tip?: number;
}

// Ensure the OrderStatus type is correctly defined
export type OrderStatus = "new" | "confirmed" | "completed" | "delivered" | "paid" | "cancelled";

// Map between Supabase enum values and our app's OrderStatus values
export type SupabaseOrderStatus = "new" | "confirmed" | "completed" | "delivered" | "paid" | "cancelled";

export function mapOrderStatusToSupabase(status: OrderStatus): SupabaseOrderStatus {
  switch (status) {
    case "new": return "new";
    case "confirmed": return "confirmed";
    case "completed": return "completed";
    case "delivered": return "delivered";
    case "paid": return "paid";
    case "cancelled": return "cancelled";
    default: return "new";
  }
}

export function mapSupabaseToOrderStatus(status: SupabaseOrderStatus): OrderStatus {
  switch (status) {
    case "new": return "new";
    case "confirmed": return "confirmed";
    case "completed": return "completed";
    case "delivered": return "delivered";
    case "paid": return "paid";
    case "cancelled": return "cancelled";
    default: return "new";
  }
}

// Profile type
export interface Profile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

// Product related types
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string | null;
  category_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Product option types
export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  required: boolean;
  enable_quantity: boolean;
  selection_type: "single" | "multiple";
  choices: ProductOptionChoice[];
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductOptionChoice {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}
