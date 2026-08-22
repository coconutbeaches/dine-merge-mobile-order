import type { Order } from "@/types/supabaseTypes";

export type PlacedOrder = Order & {
  restaurant_order_ref: string;
};
