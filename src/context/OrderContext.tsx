
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, OrderStatus, Address } from '../types'; // OrderStatus from local types
import { supabase } from '@/integrations/supabase/client';
import { useCartContext } from './CartContext';
import { useUserContext } from './UserContext';
// Import Supabase specific types
import { 
  OrderStatus as SupabaseOrderStatus, 
  PaymentStatus as SupabasePaymentStatus, 
  FulfillmentStatus as SupabaseFulfillmentStatus,
  mapOrderStatusToSupabase,
  mapSupabaseToOrderStatus
} from '@/types/supabaseTypes'; 
import { Tables } from '@/integrations/supabase/types';
import { Json } from '@/integrations/supabase/types';

type OrderRow = Tables<'orders'>; // Using Tables type from supabase client types

interface OrderContextType {
  placeOrder: (address: Address | null, paymentMethod: string, tableNumber?: string, tip?: number) => Promise<Order | null>;
  getOrderHistory: () => Order[];
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  return context;
};

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider = ({ children }: OrderProviderProps) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { currentUser } = useUserContext();
  const { cart, cartTotal, clearCart } = useCartContext();

  // Fetch user orders when user changes
  useEffect(() => {
    if (currentUser) {
      fetchUserOrders(currentUser.id);
      
      // Setup real-time subscription for orders
      const channel = supabase
        .channel(`orders-${currentUser.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${currentUser.id}` },
          (payload) => {
            console.log("Real-time order update in context:", payload);
            fetchUserOrders(currentUser.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setOrders([]);
    }
  }, [currentUser]);

  const fetchUserOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
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

          // Assert order_items to be an array of the expected structure or handle parsing
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
            items: orderItemsParsed.map((item: any) => ({ // Type 'item' properly if possible
              menuItem: {
                id: item.menuItemId,
                name: item.name,
                price: item.unitPrice,
                // Ensure all MenuItem fields are present or handle optionality
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
            // Address might be null if not applicable (e.g. for take away initially)
            address: { id: 'default', street: '', city: '', state: '', zipCode: '', isDefault: true }, 
            paymentMethod: 'Cash on Delivery', // This might need to come from DB if variable
            tableNumber: tableNumberValue,
            tip: tipValue,
          };
        });
        setOrders(formattedOrders as Order[]);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching user orders:', error);
      setOrders([]); // Ensure orders is empty on error
    }
  };

  const placeOrder = async (address: Address | null, paymentMethod: string, tableNumberInput = 'Take Away', tip?: number): Promise<Order | null> => {
    if (!currentUser) {
      console.error('User must be logged in to place an order');
      return null;
    }
    
    if (cart.length === 0) {
      console.error('Cart cannot be empty');
      return null;
    }

    const orderItemsForSupabase = cart.map(cartItem => ({
      menuItemId: cartItem.menuItem.id,
      name: cartItem.menuItem.name,
      quantity: cartItem.quantity,
      unitPrice: cartItem.menuItem.price,
      selectedOptions: cartItem.selectedOptions || {},
      // Potentially add other menuItem fields if needed by backend logic or display
      description: cartItem.menuItem.description,
      image: cartItem.menuItem.image,
      category: cartItem.menuItem.category,
    }));

    // Convert to Json type for Supabase
    const orderItemsJson = orderItemsForSupabase as unknown as Json;

    // Convert the OrderStatus.NEW to corresponding Supabase value 'pending'
    const supabaseStatus = mapOrderStatusToSupabase(OrderStatus.NEW);

    const orderPayload = {
      user_id: currentUser.id,
      customer_name: currentUser.name || currentUser.email,
      order_items: orderItemsJson,
      total_amount: cartTotal + (tip || 0),
      order_status: supabaseStatus, // Use 'pending' for Supabase
      payment_status: 'unpaid' as SupabasePaymentStatus,
      fulfillment_status: 'unfulfilled' as SupabaseFulfillmentStatus,
      table_number: tableNumberInput,
      tip: tip || 0
    };

    try {
      const { data: insertedOrderData, error } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (error) {
        console.error('Error placing order in Supabase:', error);
        return null;
      }

      if (insertedOrderData) {
        // Use optional chaining to safely access properties
        const tableNumberValue = (insertedOrderData as any).table_number || tableNumberInput;

        const newOrderForLocalState: Order = {
          id: insertedOrderData.id.toString(),
          userId: insertedOrderData.user_id || currentUser.id,
          items: cart.map(ci => ({
            menuItem: ci.menuItem,
            quantity: ci.quantity,
            selectedOptions: ci.selectedOptions,
          })),
          status: OrderStatus.NEW,
          total: insertedOrderData.total_amount,
          createdAt: new Date(insertedOrderData.created_at),
          address: address || { id: 'default', street: '', city: '', state: '', zipCode: '', isDefault: true },
          paymentMethod,
          tableNumber: tableNumberValue,
          tip,
        };
        
        setOrders(prevOrders => [newOrderForLocalState, ...prevOrders]);
        clearCart();
        return newOrderForLocalState;
      }
      return null;
    } catch (error) {
      console.error('Unexpected error during placeOrder:', error);
      return null;
    }
  };
  
  const getOrderHistory = () => {
    if (!currentUser) {
      return [];
    }
    // Ensure orders are properly typed before filtering and sorting
    return (orders as Order[]).filter(order => order.userId === currentUser.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const value = {
    placeOrder,
    getOrderHistory
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};
