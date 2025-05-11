
import { Tables, Enums } from "../integrations/supabase/types";

// Re-export the enums for convenience
export type OrderStatus = Enums["order_status"];
export type PaymentStatus = Enums["payment_status"];
export type FulfillmentStatus = Enums["fulfillment_status"];

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
