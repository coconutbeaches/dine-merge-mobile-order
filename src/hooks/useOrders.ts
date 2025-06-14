
import { useState, useEffect } from 'react';
import { Order, Address, OrderStatus } from '@/types/supabaseTypes';
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

  // Load user orders with profile information
  const loadUserOrders = async (userId: string) => {
    setIsLoading(true);
    try {
      // First fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Then fetch profile data separately
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.warn('Could not fetch profile data:', profileError);
      }

      if (ordersData) {
        const transformedOrders = ordersData.map(order => ({
          ...order,
          order_status: order.order_status as OrderStatus,
          customer_name_from_profile: profileData?.name || null,
          customer_email_from_profile: profileData?.email || null
        })) as Order[];
        
        setOrders(transformedOrders);
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
      
      // Get customer name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();
      
      const customerName = profile?.name || null;
      
      const insertedOrderData = await placeOrderInSupabase(
        userId, 
        customerName, 
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
        created_at: insertedOrderData.created_at,
        updated_at: insertedOrderData.updated_at,
        order_items: insertedOrderData.order_items,
        table_number: insertedOrderData.table_number || tableNumberInput,
        customer_name: insertedOrderData.customer_name,
        customer_name_from_profile: customerName,
        customer_email_from_profile: profile?.email || null
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
