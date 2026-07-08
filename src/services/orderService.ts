
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
    customerName,
    cartItems,
    tableNumber,
    adminCustomerId,
    adminCustomerName,
  }: {
    userId?: string | null;
    guestUserId?: string | null;
    guestFirstName?: string | null;
    // stayId / total are intentionally ignored here: the server route derives
    // stay_id from the authoritative guests row and recomputes the total from
    // product prices. They remain in the type for call-site compatibility.
    stayId?: string | null;
    customerName?: string | null;
    cartItems: CartItem[];
    total?: number;
    tableNumber?: string;
    adminCustomerId?: string | null;
    adminCustomerName?: string | null;
  }
) => {
  try {
    // Order placement runs on the server (service role) so that total_amount is
    // recomputed from authoritative prices and stay_id / guest_user_id are
    // derived from the verified session rather than trusted from the client.
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartItems,
        userId: userId || null,
        guestUserId: guestUserId || null,
        customerName: customerName || null,
        tableNumber: tableNumber || null,
        adminCustomerId: adminCustomerId || null,
        adminCustomerName: adminCustomerName || null,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to place order');
    }

    // Clear table number after successful order placement so subsequent orders
    // without rescanning will have table_number=null.
    try {
      localStorage.removeItem('table_number_pending');
    } catch (localStorageError) {
      console.warn('[Order Service] Could not clear table_number_pending (localStorage unavailable):', localStorageError);
    }

    return payload.order;
  } catch (error) {
    console.error('Error placing order via /api/orders:', error);
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

export const createAdminCustomOrder = async (
  customerId: string | null,
  customerName: string | null,
  items: CustomOrderItem[],
  orderDate: string,
  tableNumber?: string
) => {
  const response = await fetch('/api/admin/custom-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
      customerName,
      items,
      orderDate,
      tableNumber,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Error creating custom order:', payload);
    throw new Error(payload?.error || 'Failed to create custom order');
  }

  return payload.order;
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
