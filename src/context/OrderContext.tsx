
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Order, OrderStatus, Address } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { useCartContext } from './CartContext';
import { useUserContext } from './UserContext';
import { OrderStatus as SupabaseOrderStatus, PaymentStatus as SupabasePaymentStatus, FulfillmentStatus as SupabaseFulfillmentStatus } from '@/types/supabaseTypes';

interface OrderContextType {
  placeOrder: (address: Address, paymentMethod: string, tableNumber?: string, tip?: number) => Promise<Order | null>;
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
        const formattedOrders = data.map(order => ({
          id: order.id.toString(),
          userId: order.user_id || userId,
          items: order.order_items?.map((item: any) => ({
            menuItem: {
              id: item.menuItemId,
              name: item.name,
              price: item.unitPrice,
            },
            quantity: item.quantity,
            selectedOptions: item.selectedOptions || {},
          })) || [],
          status: order.order_status as OrderStatus || OrderStatus.PENDING,
          total: order.total_amount,
          createdAt: new Date(order.created_at),
          address: { id: 'default', street: '', city: '', state: '', zipCode: '', isDefault: true },
          paymentMethod: 'Cash on Delivery',
          tableNumber: order.table_number || 'Take Away',
        }));
        
        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error('Error fetching user orders:', error);
    }
  };

  // Order Management Functions
  const placeOrder = async (address: Address, paymentMethod: string, tableNumber = 'Take Away', tip?: number): Promise<Order | null> => {
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
    }));

    const orderPayload = {
      user_id: currentUser.id,
      customer_name: currentUser.name || currentUser.email,
      order_items: orderItemsForSupabase,
      total_amount: cartTotal + (tip || 0),
      order_status: 'new' as SupabaseOrderStatus,
      payment_status: 'unpaid' as SupabasePaymentStatus,
      fulfillment_status: 'unfulfilled' as SupabaseFulfillmentStatus,
      table_number: tableNumber
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
        const newOrderForLocalState: Order = {
          id: insertedOrderData.id.toString(),
          userId: insertedOrderData.user_id || currentUser.id,
          items: cart.map(ci => ({
            menuItem: ci.menuItem,
            quantity: ci.quantity,
            selectedOptions: ci.selectedOptions,
          })),
          status: (insertedOrderData.order_status as OrderStatus) || OrderStatus.PENDING,
          total: insertedOrderData.total_amount,
          createdAt: new Date(insertedOrderData.created_at),
          address,
          paymentMethod,
          tableNumber: insertedOrderData.table_number || tableNumber,
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
    return orders.filter(order => order.userId === currentUser.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  };

  const value = {
    placeOrder,
    getOrderHistory
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};
