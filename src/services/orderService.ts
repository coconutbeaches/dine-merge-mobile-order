
import { supabase } from '@/integrations/supabase/client';
import { CartItem as CartItemType } from '@/types';
import { Order, OrderStatus } from '@/types/supabaseTypes';

// Export CartItem for compatibility
export type CartItem = CartItemType;

import { getTableNumber, getGuestSession } from '@/utils/guestSession';

export async function placeOrder(orderData: {
  items: CartItem[];
  total: number;
  tableNumber?: string;
  customerName?: string;
  userId?: string;
  guestUserId?: string;
  guestFirstName?: string;
  providedTableNumber?: string;
}): Promise<{ success: boolean; orderId?: number; error?: string }> {
  try {
    console.log('Placing order with data:', orderData);

    // Get guest session and context for merging
    const guestSession = getGuestSession();
    const guestCtx = { tableNumber: typeof window !== 'undefined' ? getTableNumber() : null };
    
    // Merge according to specification:
    // tableNumber: providedTableNumber || guestCtx.tableNumber || undefined
    // guestUserId: guestSession?.guest_user_id
    // guestFirstName: guestSession?.guest_first_name
    const finalTableNumber = orderData.providedTableNumber || guestCtx.tableNumber || undefined;
    const finalGuestUserId = guestSession?.guest_user_id;
    const finalGuestFirstName = guestSession?.guest_first_name;
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.userId || null,
        guest_user_id: finalGuestUserId || null,
        guest_first_name: finalGuestFirstName || null,
        stay_id: guestSession?.guest_stay_id || null,
        total_amount: orderData.total,
        order_status: 'new',
        order_items: orderData.items as any, // Cast to Json
        table_number: finalTableNumber,
        customer_name: orderData.customerName
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Order placed successfully:', data);
    localStorage.removeItem('table_number_pending');
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
  {
    userId,
    guestUserId,
    guestFirstName,
    stayId,
    customerName,
    cartItems,
    total,
    tableNumber
  }: {
    userId?: string | null;
    guestUserId?: string | null;
    guestFirstName?: string | null;
    stayId?: string | null;
    customerName?: string | null;
    cartItems: CartItem[];
    total: number;
    tableNumber?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId || null,
        guest_user_id: guestUserId || null,
        guest_first_name: guestFirstName || null,
        stay_id: stayId || null,
        customer_name: customerName,
        order_items: cartItems as any, // Cast to Json
        total_amount: total,
        table_number: tableNumber,
        order_status: 'new'
      })
      .select()
      .single();

    if (error) throw error;
    
    // Clear table number after successful order placement
    // This ensures subsequent orders without rescanning will have table_number=null
    try {
      localStorage.removeItem('table_number_pending');
      console.log('[Order Service] Cleared table_number_pending after successful order');
    } catch (localStorageError) {
      console.warn('[Order Service] Could not clear table_number_pending (localStorage unavailable):', localStorageError);
      // Don't throw - localStorage errors shouldn't fail the order
    }
    
    return data;
  } catch (error) {
    console.error('Error placing order in Supabase:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

export type CustomOrderItem = {
  product: string;
  price: number;
  quantity: number;
};

export const createCustomOrder = async (
  customerId: string | null,
  customerName: string | null,
  items: CustomOrderItem[],
  orderDate: string,
  tableNumber?: string
) => {
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  
  // Use the provided datetime directly since it should now include time
  const finalDateTime = orderDate;
  
  // Determine if customerId is a UUID (regular user) or stay_id (hotel guest)
  const isUUID = customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
  
  const orderData: any = {
    customer_name: customerName,
    order_items: items as any,
    total_amount: total,
    order_status: 'completed',
    created_at: finalDateTime,
    table_number: tableNumber || null,
  };
  
  if (isUUID) {
    // Regular authenticated user
    orderData.user_id = customerId;
  } else if (customerId) {
    // Hotel guest - use stay_id
    orderData.stay_id = customerId;
  }
  
  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  if (error) {
    console.error('Error creating custom order:', error);
    console.error('Order data that failed:', JSON.stringify(orderData, null, 2));
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    throw error;
  }

  return data;
};

export const getFilteredOrderHistory = (orders: Order[], userId?: string, hasGuestSession?: boolean) => {
  if (!userId) return [];
  
  return orders.filter(order => {
    if (hasGuestSession) {
      // For guest sessions, filter by user_id OR guest_user_id
      return order.user_id === userId || order.guest_user_id === userId;
    } else {
      // For regular sessions, filter by user_id only
      return order.user_id === userId;
    }
  });
};
