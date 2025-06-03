
import { supabase } from '@/integrations/supabase/client';
import { Address, Order, OrderStatus } from '@/types';
import { 
  SupabaseOrderStatus,
  mapOrderStatusToSupabase,
  mapSupabaseToOrderStatus
} from '@/types/supabaseTypes';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type CartItem = {
  menuItem: {
    id: string;
    name: string;
    price: number;
    description: string;
    image: string;
    category: string;
    available: boolean;
  };
  quantity: number;
  selectedOptions?: any;
};

export async function fetchUserOrders(userId: string): Promise<Order[] | null> {
  try {
    console.log("Fetching orders for user:", userId);
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return null;
    }

    console.log("Orders fetched from Supabase:", data);

    if (data && data.length > 0) {
      const formattedOrders = data.map(order => {
        // Determine the correct OrderStatus
        let orderStatus: OrderStatus;
        
        if (order.order_status) {
          // Map Supabase order_status to our application OrderStatus string
          const mappedStatusString = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          
          // Convert from string to our enum OrderStatus
          switch(mappedStatusString) {
            case 'new': orderStatus = OrderStatus.NEW; break;
            case 'confirmed': orderStatus = OrderStatus.CONFIRMED; break;
            case 'completed': orderStatus = OrderStatus.COMPLETED; break;
            case 'delivered': orderStatus = OrderStatus.DELIVERED; break;
            case 'paid': orderStatus = OrderStatus.PAID; break;
            case 'cancelled': orderStatus = OrderStatus.CANCELLED; break;
            default: orderStatus = OrderStatus.NEW; // Or handle as an error
          }
        } else {
          // Default fallback
          orderStatus = OrderStatus.NEW;
        }

        // Parse order items - fix type casting issue
        const orderItemsParsed = Array.isArray(order.order_items) 
          ? order.order_items 
          : typeof order.order_items === 'string' 
            ? JSON.parse(order.order_items) 
            : ((order.order_items as unknown as any) || []);

        // Use safer property access with optional chaining
        const tableNumberValue = order.table_number || 'Take Away';
        const tipValue = order.tip || 0;

        return {
          id: order.id.toString(),
          userId: order.user_id || userId,
          items: Array.isArray(orderItemsParsed) ? orderItemsParsed.map((item: any) => ({
            menuItem: {
              id: item.menuItemId,
              name: item.name,
              price: item.unitPrice,
              description: item.description || '',
              image: item.image || '',
              category: item.category || '',
              available: item.available !== undefined ? item.available : true,
            },
            quantity: item.quantity,
            selectedOptions: item.selectedOptions || {},
          })) : [],
          status: orderStatus,
          total: order.total_amount,
          createdAt: new Date(order.created_at),
          address: { id: 'default', street: '', city: '', state: '', zipCode: '', isDefault: true }, 
          paymentMethod: 'Cash on Delivery',
          tableNumber: tableNumberValue,
          tip: tipValue,
        };
      });
      
      console.log("Formatted orders:", formattedOrders);
      return formattedOrders as Order[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return [];
  }
}

export async function placeOrderInSupabase(
  userId: string, 
  userName: string | null, 
  cartItems: CartItem[], 
  cartTotal: number,
  tableNumberInput: string = 'Take Away'
): Promise<any | null> {
  console.log("Placing order in Supabase with:", {
    userId,
    userName,
    cartItemsCount: cartItems.length,
    cartTotal,
    tableNumberInput
  });

  try {
    const orderItemsForSupabase = cartItems.map(cartItem => ({
      menuItemId: cartItem.menuItem.id,
      name: cartItem.menuItem.name,
      quantity: cartItem.quantity,
      unitPrice: cartItem.menuItem.price,
      selectedOptions: cartItem.selectedOptions || {},
      description: cartItem.menuItem.description,
      image: cartItem.menuItem.image,
      category: cartItem.menuItem.category,
    }));

    console.log("Prepared order items for Supabase:", orderItemsForSupabase);

    // Convert to Json type for Supabase
    const orderItemsJson = orderItemsForSupabase as unknown as Json;

    // Convert the OrderStatus.NEW to corresponding Supabase value using the mapping function
    const supabaseStatus = mapOrderStatusToSupabase(OrderStatus.NEW);

    const orderPayload = {
      user_id: userId,
      customer_name: userName || userId,
      order_items: orderItemsJson,
      total_amount: cartTotal,
      order_status: supabaseStatus as SupabaseOrderStatus, // Use the mapped Supabase-compatible value with type assertion
      table_number: tableNumberInput
    };

    console.log("Order payload for Supabase:", orderPayload);

    const { data, error } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (error) {
      console.error('Error placing order in Supabase:', error);
      return null;
    }

    console.log("Order created in Supabase:", data);
    return data;
  } catch (error) {
    console.error('Unexpected error during placeOrder:', error);
    return null;
  }
}

export function getFilteredOrderHistory(orders: Order[], userId: string | undefined): Order[] {
  if (!userId) {
    return [];
  }
  
  return orders.filter(order => order.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Placeholder for updateOrderPaymentStatus
export async function updateOrderPaymentStatus(orderId: string, paymentStatus: string): Promise<boolean> {
  console.log(`Updating payment status for order ${orderId} to ${paymentStatus}`);
  // TODO: Implement actual logic
  return true;
}

// Placeholder for updateOrderStatus
export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
  console.log(`Updating status for order ${orderId} to ${status}`);
  // TODO: Implement actual logic
  return true;
}

// Placeholder for addOrderNotes
export async function addOrderNotes(orderId: string, notes: string): Promise<boolean> {
  console.log(`Adding notes to order ${orderId}: ${notes}`);
  // TODO: Implement actual logic
  return true;
}

// Placeholder for markOrderAsWhatsappSent
export async function markOrderAsWhatsappSent(orderId: string): Promise<boolean> {
  console.log(`Marking order ${orderId} as WhatsApp sent`);
  // TODO: Implement actual logic
  return true;
}

// Placeholder for deleteOrder
export async function deleteOrder(orderId: string): Promise<boolean> {
  console.log(`Deleting order ${orderId}`);
  // TODO: Implement actual logic
  return true;
}

// Placeholder for getAllOrdersForAdmin
export async function getAllOrdersForAdmin(): Promise<Order[]> {
  console.log("Fetching all orders for admin");
  // TODO: Implement actual logic
  return [];
}

// Renaming placeOrderInSupabase to createOrder for clarity as per subtask, and ensuring it's exported.
// If placeOrderInSupabase was already exported, this just re-confirms.
export { placeOrderInSupabase as createOrder };


/**
 * Allows an admin to update specific details of an order.
 * Currently supports updating order_status and table_number.
 * @param orderId The ID of the order to update.
 * @param details An object containing the order fields to update.
 * @returns The updated order data.
 * @throws If the update fails.
 */
export const adminUpdateOrderDetails = async (
  orderId: string,
  details: {
    order_status?: SupabaseOrderStatus;
    table_number?: string;
    // Potentially other fields like user_id, order_items in the future
  }
) => {
  if (!orderId) {
    toast.error("Order ID is required to update order details.");
    throw new Error("Order ID is required to update order details.");
  }
  if (Object.keys(details).length === 0) {
    toast.info("No details provided to update for the order.");
    // Depending on desired behavior, could return null or throw an error
    return null;
  }

  console.log(`Admin updating order ${orderId} with details:`, details);

  // Ensure empty string for table_number is handled as intended (e.g., set to null or allow empty string)
  // If table_number can be cleared, Supabase might need `null` instead of `''` if the column is nullable.
  // For now, we pass the string value directly.
  const updatePayload = { ...details };
  if (details.table_number === '') {
      // If you want to clear it and the DB column is nullable string:
      // updatePayload.table_number = null;
      // If empty string is acceptable or it's a text column that's not nullable:
      // keep as is. For now, we assume empty string is fine.
  }


  const { data, error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .select() // Select the updated row to confirm and get fresh data
    .single(); // Expect a single row

  if (error) {
    console.error(`Error updating order ${orderId} via admin:`, error);
    toast.error(`Error updating order: ${error.message}`);
    throw error; // Re-throw to be caught by the calling form/component
  }

  if (!data) {
    toast.warn(`Order ${orderId} update seemed to succeed but no data was returned.`);
    return null;
  }

  // toast.success(`Order ${orderId} updated successfully by admin!`); // Form can show its own toast
  console.log(`Order ${orderId} updated by admin:`, data);
  return data;
};
