import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types/CartItem';
import { Order, SupabaseOrderStatus, mapSupabaseToOrderStatus } from '@/types/supabaseTypes';

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
      .insert([
        {
          user_id: orderData.userId || null,
          total_amount: orderData.total,
          order_status: 'new' as SupabaseOrderStatus,
          order_items: orderData.items,
          table_number: orderData.tableNumber,
          customer_name: orderData.customerName,
          payment_status: 'unpaid',
          fulfillment_status: 'unfulfilled'
        }
      ])
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

const formatOrders = (orders: any[]): Order[] => {
  return orders.map(order => ({
    id: order.id.toString(),
    userId: order.user_id,
    items: order.order_items || [],
    status: mapSupabaseToOrderStatus(order.order_status),
    total: order.total_amount,
    createdAt: new Date(order.created_at),
    address: {
      id: 'default',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      isDefault: true
    },
    paymentMethod: 'Cash on Delivery',
    tableNumber: order.table_number || 'N/A',
    tip: order.tip || 0
  }));
};
