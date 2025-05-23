import { supabase } from '@/integrations/supabase/client';
// Import SelectedOptionsType from the canonical source
import { Address, Order, OrderStatus, SelectedOptionsType } from '@/types'; 
import { 
  SupabaseOrderStatus, 
  PaymentStatus as SupabasePaymentStatus, 
  FulfillmentStatus as SupabaseFulfillmentStatus,
  mapOrderStatusToSupabase,
  mapSupabaseToOrderStatus
} from '@/types/supabaseTypes';
import { Json } from '@/integrations/supabase/types';

// Remove local definition of SelectedOptionsType as it's now imported

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
  selectedOptions?: SelectedOptionsType; // Now uses the imported type
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
        let orderStatus: OrderStatus;
        
        if (order.payment_status === 'paid') {
          orderStatus = OrderStatus.PAID;
        } else if (order.order_status) {
          const mappedStatusString = mapSupabaseToOrderStatus(order.order_status as SupabaseOrderStatus);
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
          orderStatus = OrderStatus.NEW;
        }

        const orderItemsParsed = Array.isArray(order.order_items) 
          ? order.order_items 
          : typeof order.order_items === 'string' 
            ? JSON.parse(order.order_items) 
            : ((order.order_items as unknown as any) || []);

        const tableNumberValue = order.table_number || 'Take Away';
        const tipValue = order.tip || 0;

        return {
          id: order.id.toString(),
          userId: order.user_id || userId,
          items: Array.isArray(orderItemsParsed) ? orderItemsParsed.map((item: any) => ({
            menuItem: {
              id: item.menu_item_id, 
              name: item.name,
              price: item.unit_price, 
              description: item.description || '',
              image: item.image || '',
              category: item.category || '',
              available: item.available !== undefined ? item.available : true,
            },
            quantity: item.quantity,
            selectedOptions: item.selected_options || {}, 
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
      menu_item_id: cartItem.menuItem.id, 
      name: cartItem.menuItem.name,
      quantity: cartItem.quantity,
      unit_price: cartItem.menuItem.price, 
      selected_options: cartItem.selectedOptions || {}, 
      description: cartItem.menuItem.description,
      image: cartItem.menuItem.image,
      category: cartItem.menuItem.category,
    }));

    console.log("Prepared order items for Supabase:", orderItemsForSupabase);

    const orderItemsJson = orderItemsForSupabase as unknown as Json;

    const supabaseStatus = mapOrderStatusToSupabase(OrderStatus.NEW);

    const orderPayload = {
      user_id: userId,
      customer_name: userName || userId,
      order_items: orderItemsJson,
      total_amount: cartTotal,
      order_status: supabaseStatus as SupabaseOrderStatus, 
      payment_status: 'unpaid' as SupabasePaymentStatus,
      fulfillment_status: 'unfulfilled' as SupabaseFulfillmentStatus,
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
