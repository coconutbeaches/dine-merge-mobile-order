import { supabase } from '@/integrations/supabase/client';
import { CartItem as CartItemType } from '@/types';
import { Order, OrderStatus } from '@/types/supabaseTypes';

// Export CartItem for compatibility
export type CartItem = CartItemType;

export async function placeOrder(orderData: {
  items: CartItem[];
  total: number;
  tableNumber: string;
  customerName?: string;
  userId?: string;
}): Promise<{ success: boolean; orderId?: number; error?: string }> {
  try {
    console.log('Placing order with data:', orderData);
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.userId || null,
        total_amount: orderData.total,
        order_status: 'new',
        order_items: orderData.items as any, // Cast to Json
        table_number: orderData.tableNumber,
        customer_name: orderData.customerName
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Order placed successfully:', data);
    return { success: true, orderId: data.id };
  } catch (error: any) {
    console.error('Error placing order:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to place order' 
    };
  }
}

export const fetchUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(order => ({
      ...order,
      order_status: order.order_status as OrderStatus
    })) as Order[];
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
};

export const placeOrderInSupabase = async (
  userId: string | null,
  customerName: string | null,
  cartItems: CartItem[],
  total: number,
  tableNumber: string
) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        customer_name: customerName,
        order_items: cartItems as any, // Cast to Json
        total_amount: total,
        table_number: tableNumber,
        order_status: 'new'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error placing order in Supabase:', error);
    throw error;
  }
};

export const getFilteredOrderHistory = (orders: Order[], userId?: string) => {
  if (!userId) return [];
  return orders.filter(order => order.user_id === userId);
};
