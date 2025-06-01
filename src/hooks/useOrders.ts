
import { useState, useEffect } from 'react';
import { Order, Address, OrderStatus } from '@/types/supabaseTypes'; // Use supabaseTypes consistently
import { supabase } from '@/integrations/supabase/client';
import { useCartContext } from '@/context/CartContext';
import { CartItem, fetchUserOrders, placeOrderInSupabase, getFilteredOrderHistory } from '@/services/orderService';
import { toast } from 'sonner';

export function useOrders(userId: string | undefined) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(true);
    try {
      const userOrders = await fetchUserOrders(userId);
      if (userOrders) {
        setOrders(userOrders);
      }
    } catch (error) {
      console.error("Error loading user orders:", error);
      toast.error("Failed to load your orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Place a new order
  const placeOrder = async (
    address: Address | null, 
    paymentMethod: string, 
    tableNumberInput = 'Take Away'
  ): Promise<Order | null> => {
    if (!userId) {
      console.error('User must be logged in to place an order');
      return null;
    }
    
    if (cart.length === 0) {
      console.error('Cart cannot be empty');
      return null;
    }

    try {
      console.log("useOrders: Placing order with:", { 
        userId, 
        address, 
        paymentMethod, 
        cart: cart.length, 
        tableNumberInput
      });
      
      // Use the first item's name or userId as customer name
      const userName = cart[0]?.menuItem?.name ? cart[0].menuItem.name : null;
      
      const insertedOrderData = await placeOrderInSupabase(
        userId, 
        userName, 
        cart as CartItem[], 
        cartTotal, 
        tableNumberInput
      );

      if (!insertedOrderData) {
        console.error("Failed to insert order in Supabase");
        return null;
      }

      console.log("Order inserted in Supabase:", insertedOrderData);

      // Create a new order that matches the Order interface from supabaseTypes
      const newOrderForLocalState: Order = {
        id: insertedOrderData.id,
        user_id: insertedOrderData.user_id || userId,
        total_amount: insertedOrderData.total_amount,
        order_status: 'new' as OrderStatus,
        payment_status: insertedOrderData.payment_status || 'unpaid',
        created_at: insertedOrderData.created_at,
        updated_at: insertedOrderData.updated_at,
        order_items: insertedOrderData.order_items,
        table_number: insertedOrderData.table_number || tableNumberInput,
        customer_name: insertedOrderData.customer_name,
        tip: insertedOrderData.tip || 0
      };
      
      console.log("New order created for local state:", newOrderForLocalState);
      setOrders(prevOrders => [newOrderForLocalState, ...prevOrders]);
      return newOrderForLocalState;
    } catch (error) {
      console.error('Error in placeOrder:', error);
      return null;
    }
  };
  
  const getOrderHistory = () => {
    return getFilteredOrderHistory(orders, userId);
  };

  return {
    orders,
    isLoading,
    placeOrder,
    getOrderHistory,
    loadUserOrders
  };
}
