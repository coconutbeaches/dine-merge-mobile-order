
// Add the table_number to the Order type
export interface Order {
  id: number;
  user_id?: string;
  customer_name?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  order_status: OrderStatus;
  payment_status?: string;
  fulfillment_status?: string;
  order_items?: any;
  table_number?: string;
  tip?: number;
}

// Ensure the OrderStatus type is correctly defined
export type OrderStatus = "new" | "confirmed" | "delivered" | "paid" | "cancelled";

// Map between Supabase enum values and our app's OrderStatus values
export type SupabaseOrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export function mapOrderStatusToSupabase(status: OrderStatus): SupabaseOrderStatus {
  switch (status) {
    case "new": return "pending";
    case "confirmed": return "confirmed";
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
