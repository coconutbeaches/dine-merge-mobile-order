
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

export type CustomOrderItem = {
  product: string;
  price: number;
  quantity: number;
};

export const createCustomOrder = async (
  customerId: string,
  customerName: string | null,
  items: CustomOrderItem[],
  orderDate: string
) => {
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  // Parse the orderDate and preserve current time if only date is provided
  const parsedDate = new Date(orderDate);
  const now = new Date();
  
  // If the date is set to midnight (00:00:00), use current time instead
  let finalDateTime: string;
  if (parsedDate.getHours() === 0 && parsedDate.getMinutes() === 0 && parsedDate.getSeconds() === 0) {
    // Date was likely just a date string without time, so use current time
    parsedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    finalDateTime = parsedDate.toISOString();
  } else {
    // Use the provided datetime as-is
    finalDateTime = orderDate;
  }
  
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: customerId,
      customer_name: customerName,
      order_items: items as any,
      total_amount: total,
      order_status: 'completed',
      created_at: finalDateTime,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom order:', error);
    throw error;
  }

  return data;
};

export const getFilteredOrderHistory = (orders: Order[], userId?: string) => {
  if (!userId) return [];
  return orders.filter(order => order.user_id === userId);
};
