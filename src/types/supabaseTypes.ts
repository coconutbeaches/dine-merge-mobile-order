export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: number | null
          created_at: string
          description: string | null
          id: number
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          category_id?: number | null
          created_at?: string
          description?: string | null
          id?: number
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          id: number
          order_items: Json | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          table_number: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: number
          order_items?: Json | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          table_number?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: number
          order_items?: Json | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          table_number?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
          phone: string | null
          role: string | null
          created_at: string
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
          phone?: string | null
          role?: string | null
          created_at?: string
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
          phone?: string | null
          role?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status:
        | "new"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
        | "paid"
      payment_status: "unpaid" | "paid" | "pending" | "failed" | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type MenuItems = Database["public"]["Tables"]["menu_items"]["Row"]
export type Category = Database["public"]["Tables"]["categories"]["Row"]

// Address type
export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

// Product types based on actual database schema
export type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  category_id?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

// Profile type
export type Profile = {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role?: string | null;
  created_at: string;
  updated_at: string;
};

// Product option types
export interface ProductOptionChoice {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  required: boolean;
  selection_type: "single" | "multiple";
  max_selections?: number | null;
  sort_order: number;
  choices: ProductOptionChoice[];
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string | null;
}

// Reverted to 'delivery' to align with existing frontend code and fix build errors.
export type OrderStatus = 
  'new' | 
  'preparing' | 
  'ready' | 
  'delivery' | 
  'completed' | 
  'paid' | 
  'cancelled';
export type SupabaseOrderStatus = Database["public"]["Enums"]["order_status"];

// Update mapping functions to handle frontend 'delivery' and backend 'out_for_delivery'.
export const mapOrderStatusToSupabase = (status: OrderStatus): SupabaseOrderStatus => {
  switch (status) {
    case 'delivery': return 'out_for_delivery';
    case 'new': return 'new';
    case 'preparing': return 'preparing';
    case 'ready': return 'ready';
    case 'completed': return 'completed';
    case 'paid': return 'paid';
    case 'cancelled': return 'cancelled';
    default: return 'new';
  }
};

export const mapSupabaseToOrderStatus = (status: SupabaseOrderStatus): OrderStatus => {
  switch (status) {
    case 'out_for_delivery': return 'delivery';
    case 'new': return 'new';
    case 'preparing': return 'preparing';
    case 'ready': return 'ready';
    case 'completed': return 'completed';
    case 'paid': return 'paid';
    case 'cancelled': return 'cancelled';
    default: return 'new';
  }
};

export interface Order {
  id: number;
  user_id?: string;
  total_amount: number;
  order_status: OrderStatus;
  created_at: string;
  updated_at: string;
  order_items: any;
  table_number?: string;
  customer_name?: string;
  customer_name_from_profile?: string;
  customer_email_from_profile?: string;
}
