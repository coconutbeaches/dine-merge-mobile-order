
import { supabase } from '@/integrations/supabase/client';
import { Address, Order, OrderStatus } from '@/types';
import { 
  SupabaseOrderStatus, 
  PaymentStatus as SupabasePaymentStatus, 
  FulfillmentStatus as SupabaseFulfillmentStatus,
  mapOrderStatusToSupabase,
  mapSupabaseToOrderStatus
} from '@/types/supabaseTypes';
import { Json } from '@/integrations/supabase/types';

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
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return null;
    }

    if (data && data.length > 0) {
      const formattedOrders = data.map(order => {
        // Determine the correct OrderStatus
        let orderStatus: OrderStatus;
        
        // Special handling for 'paid' orders
        if (order.payment_status === 'paid') {
          orderStatus = OrderStatus.PAID;
        } else if (order.order_status) {
          // Map Supabase order_status to our application OrderStatus string
          const mappedStatusString = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
          
          // Convert from string to our enum OrderStatus
          switch(mappedStatusString) {
            case 'new': orderStatus = OrderStatus.NEW; break;
            case 'confirmed': orderStatus = OrderStatus.CONFIRMED; break;
            case 'make': orderStatus = OrderStatus.MAKE; break;
            case 'ready': orderStatus = OrderStatus.READY; break;
            case 'delivered': orderStatus = OrderStatus.DELIVERED; break;
            case 'paid': orderStatus = OrderStatus.PAID; break;
            case 'cancelled': orderStatus = OrderStatus.CANCELLED; break;
            default: orderStatus = OrderStatus.NEW;
          }
        } else {
          // Default fallback
          orderStatus = OrderStatus.NEW;
        }

        // Parse order items 
        const orderItemsParsed: any[] = Array.isArray(order.order_items) 
          ? order.order_items 
          : typeof order.order_items === 'string' 
            ? JSON.parse(order.order_items) 
            : [];

        // Use optional chaining to safely access properties
        const tableNumberValue = (order as any).table_number || 'Take Away';
        const tipValue = (order as any).tip || 0;

        return {
          id: order.id.toString(),
          userId: order.user_id || userId,
          items: orderItemsParsed.map((item: any) => ({
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
          })),
          status: orderStatus,
          total: order.total_amount,
          createdAt: new Date(order.created_at),
          address: { id: 'default', street: '', city: '', state: '', zipCode: '', isDefault: true }, 
          paymentMethod: 'Cash on Delivery',
          tableNumber: tableNumberValue,
          tip: tipValue,
        };
      });
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
  tableNumberInput: string = 'Take Away',
  tip?: number
): Promise<any | null> {
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

  // Convert to Json type for Supabase
  const orderItemsJson = orderItemsForSupabase as unknown as Json;

  // Convert the OrderStatus.NEW to corresponding Supabase value using the mapping function
  const supabaseStatus = mapOrderStatusToSupabase(OrderStatus.NEW);

  const orderPayload = {
    user_id: userId,
    customer_name: userName || userId,
    order_items: orderItemsJson,
    total_amount: cartTotal + (tip || 0),
    order_status: supabaseStatus as SupabaseOrderStatus, // Use the mapped Supabase-compatible value with type assertion
    payment_status: 'unpaid' as SupabasePaymentStatus,
    fulfillment_status: 'unfulfilled' as SupabaseFulfillmentStatus,
    table_number: tableNumberInput,
    tip: tip || 0
  };

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (error) {
      console.error('Error placing order in Supabase:', error);
      return null;
    }

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
