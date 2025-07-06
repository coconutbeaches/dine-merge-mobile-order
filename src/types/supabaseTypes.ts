export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      guest_users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          first_name: string
          id: string
          stay_id: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          first_name: string
          id?: string
          stay_id: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          first_name?: string
          id?: string
          stay_id?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      guests: {
        Row: {
          created_at: string | null
          first_name: string
          id: string
          stay_id: string
        }
        Insert: {
          created_at?: string | null
          first_name: string
          id?: string
          stay_id: string
        }
        Update: {
          created_at?: string | null
          first_name?: string
          id?: string
          stay_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          guest_first_name: string | null
          guest_user_id: string | null
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
          guest_first_name?: string | null
          guest_user_id?: string | null
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
          guest_first_name?: string | null
          guest_user_id?: string | null
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
            isOneToOne: false
            referencedRelation: "customer_with_last_order"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_option_choices: {
        Row: {
          created_at: string
          id: string
          name: string
          option_id: string
          price_adjustment: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          option_id: string
          price_adjustment?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          option_id?: string
          price_adjustment?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_option_choices_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "product_options"
            referencedColumns: ["id"]
          },
        ]
      }
      product_options: {
        Row: {
          created_at: string
          enable_quantity: boolean
          id: string
          max_selections: number | null
          name: string
          product_id: string
          required: boolean
          selection_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enable_quantity?: boolean
          id?: string
          max_selections?: number | null
          name: string
          product_id: string
          required?: boolean
          selection_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enable_quantity?: boolean
          id?: string
          max_selections?: number | null
          name?: string
          product_id?: string
          required?: boolean
          selection_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          archived: boolean | null
          avatar_path: string | null
          avatar_url: string | null
          created_at: string
          customer_type: string | null
          email: string
          id: string
          name: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean | null
          avatar_path?: string | null
          avatar_url?: string | null
          created_at?: string
          customer_type?: string | null
          email: string
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean | null
          avatar_path?: string | null
          avatar_url?: string | null
          created_at?: string
          customer_type?: string | null
          email?: string
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_with_last_order: {
        Row: {
          customer_id: string | null
          email: string | null
          joined_at: string | null
          last_order_date: string | null
          name: string | null
          total_spent: number | null
        }
        Insert: {
          customer_id?: string | null
          email?: string | null
          joined_at?: string | null
          last_order_date?: never
          name?: string | null
          total_spent?: never
        }
        Update: {
          customer_id?: string | null
          email?: string | null
          joined_at?: string | null
          last_order_date?: never
          name?: string | null
          total_spent?: never
        }
        Relationships: []
      }
    }
    Functions: {
      get_all_customers_with_total_spent_grouped: {
        Args: Record<PropertyKey, never>
        Returns: {
          customer_id: string
          name: string
          customer_type: string
          total_spent: number
          last_order_date: string
          archived: boolean
          joined_at: string
        }[]
      }
      get_customers_with_total_spent: {
        Args: Record<PropertyKey, never> | { include_archived?: boolean }
        Returns: {
          id: string
          name: string
          email: string
          phone: string
          role: string
          customer_type: string
          created_at: string
          updated_at: string
          total_spent: number
          avatar_path: string
          last_order_date: string
          archived: boolean
        }[]
      }
      get_orders_by_product: {
        Args: {
          p_product_id: string
          p_customer_type: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          id: string
          user_id: string
          total_price: number
          order_status: Database["public"]["Enums"]["order_status"]
          created_at: string
          updated_at: string
          customer_name: string
          order_items: Json
          table_number: string
        }[]
      }
      get_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      is_user_in_auth: {
        Args: { user_id_to_check: string }
        Returns: boolean
      }
      merge_customers: {
        Args: { source_id: string; target_id: string }
        Returns: undefined
      }
      orders_by_day_and_guest_type: {
        Args: { start_date: string; end_date: string }
        Returns: {
          order_date: string
          hotel_guest_orders: number
          outside_guest_orders: number
          hotel_guest_revenue: number
          outside_guest_revenue: number
          guest_count: number
          non_guest_count: number
          guest_amount: number
          non_guest_amount: number
        }[]
      }
      top_products_by_quantity: {
        Args: { start_date: string; end_date: string }
        Returns: {
          product_id: string
          product_name: string
          hotel_guest_quantity: number
          non_guest_quantity: number
          total_quantity: number
        }[]
      }
      update_profile_details: {
        Args: { user_id: string; new_name: string; new_phone: string }
        Returns: undefined
      }
    }
    Enums: {
      fulfillment_status:
        | "unfulfilled"
        | "ready"
        | "out_for_delivery"
        | "fulfilled"
      order_status:
        | "new"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
        | "paid"
      payment_status:
        | "unpaid"
        | "confirming_payment"
        | "partially_paid"
        | "paid"
        | "refunded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fulfillment_status: [
        "unfulfilled",
        "ready",
        "out_for_delivery",
        "fulfilled",
      ],
      order_status: [
        "new",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
        "paid",
      ],
      payment_status: [
        "unpaid",
        "confirming_payment",
        "partially_paid",
        "paid",
        "refunded",
      ],
    },
  },
} as const

// Type aliases for convenience
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type ProductOption = Database['public']['Tables']['product_options']['Row'];
export type ProductOptionChoice = Database['public']['Tables']['product_option_choices']['Row'];

// Extended types with relationships
export interface ProductOptionWithChoices extends ProductOption {
  choices: ProductOptionChoice[];
}

// Enum types
export type OrderStatus = Database['public']['Enums']['order_status'];
export type FulfillmentStatus = Database['public']['Enums']['fulfillment_status'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];

// Grouped customer type for dashboard (combines auth users and guest families)
export interface GroupedCustomer {
  customer_id: string; // UUID for profiles, TEXT stay_id for guests
  name: string;
  customer_type: 'auth_user' | 'guest_family';
  total_spent: number;
  last_order_date: string | null;
  archived: boolean;
  joined_at: string;
}
