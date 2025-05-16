
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
  payment_status?: PaymentStatus;
  fulfillment_status?: FulfillmentStatus;
  order_items?: any;
  table_number?: string;
  tip?: number;
}

// Ensure the OrderStatus type is correctly defined
export type OrderStatus = "new" | "confirmed" | "make" | "ready" | "delivered" | "paid" | "cancelled";

// Map between Supabase enum values and our app's OrderStatus values
export type SupabaseOrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export function mapOrderStatusToSupabase(status: OrderStatus): SupabaseOrderStatus {
  switch (status) {
    case "new": return "pending";
    case "confirmed": return "confirmed";
    case "make": return "confirmed";
    case "ready": return "confirmed";
    case "delivered": return "completed";
    case "paid": return "completed";
    case "cancelled": return "cancelled";
    default: return "pending";
  }
}

export function mapSupabaseToOrderStatus(status: SupabaseOrderStatus): OrderStatus {
  switch (status) {
    case "pending": return "new";
    case "confirmed": return "confirmed";
    case "completed": return "delivered"; // Note: could be either delivered or paid
    case "cancelled": return "cancelled";
    default: return "new";
  }
}

// Payment and Fulfillment Status types
export type PaymentStatus = "unpaid" | "confirming_payment" | "partially_paid" | "paid" | "refunded";
export type FulfillmentStatus = "unfulfilled" | "ready" | "out_for_delivery" | "fulfilled";

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
  image_url?: string;
  category_id?: string;
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
}

export interface ProductOptionChoice {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  sort_order: number;
}
