
import { useState, useEffect } from 'react';
import { Order, Address, OrderStatus } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useCartContext } from '@/context/CartContext';
import { CartItem, fetchUserOrders, placeOrderInSupabase, getFilteredOrderHistory } from '@/services/orderService';

export function useOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<Order[]>([]);
  const { cart, cartTotal, clearCart } = useCartContext();

  // Fetch orders when userId changes
  useEffect(() => {
    if (userId) {
      loadUserOrders(userId);
      
      // Setup real-time subscription for orders
      const channel = supabase
        .channel(`orders-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
          (payload) => {
            console.log("Real-time order update in orders hook:", payload);
            loadUserOrders(userId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setOrders([]);
    }
  }, [userId]);

  // Load user orders
  const loadUserOrders = async (userId: string) => {
    const userOrders = await fetchUserOrders(userId);
    if (userOrders) {
      setOrders(userOrders);
    }
  };

  // Place a new order
  const placeOrder = async (address: Address | null, paymentMethod: string, tableNumberInput = 'Take Away', tip?: number): Promise<Order | null> => {
    if (!userId) {
      console.error('User must be logged in to place an order');
      return null;
    }
    
    if (cart.length === 0) {
      console.error('Cart cannot be empty');
      return null;
    }

    const userName = cart[0]?.menuItem?.name ? cart[0].menuItem.name : null;
    const insertedOrderData = await placeOrderInSupabase(
      userId, 
      userName, 
      cart as CartItem[], 
      cartTotal, 
      tableNumberInput, 
      tip
    );

    if (insertedOrderData) {
      // Use optional chaining to safely access properties
      const tableNumberValue = (insertedOrderData as any).table_number || tableNumberInput;

      const newOrderForLocalState: Order = {
        id: insertedOrderData.id.toString(),
        userId: insertedOrderData.user_id || userId,
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
  };
  
  const getOrderHistory = () => {
    return getFilteredOrderHistory(orders, userId);
  };

  return {
    orders,
    placeOrder,
    getOrderHistory,
    loadUserOrders
  };
}
