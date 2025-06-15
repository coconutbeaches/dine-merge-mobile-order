
import React from 'react';
import { useCartContext } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, placeOrderInSupabase } from '@/services/orderService';
import { Address, Order, OrderStatus } from '@/types/supabaseTypes';
import { toast } from 'sonner';

export function usePlaceOrder(
  userId: string | undefined,
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
) {
  const { cart, cartTotal, clearCart } = useCartContext();

  const placeOrder = async (
    address: Address | null, 
    paymentMethod: string, 
    tableNumberInput = 'Take Away',
    adminContext: { customerId: string, customerName: string } | null = null
  ): Promise<Order | null> => {
    const finalUserId = adminContext?.customerId || userId;
    
    if (!finalUserId) {
      console.error('User must be logged in to place an order');
      toast.error('You must be logged in to place an order');
      return null;
    }
    
    if (cart.length === 0) {
      console.error('Cart cannot be empty');
      toast.error('Your cart is empty');
      return null;
    }

    try {
      console.log("useOrders: Placing order with:", { 
        userId: finalUserId, 
        address, 
        paymentMethod, 
        cart: cart.length, 
        tableNumberInput,
        adminContext
      });
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', finalUserId)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile for order:", profileError);
      }
      
      const customerName = adminContext?.customerName || profile?.name || null;
      console.log("Customer profile found:", profile);
      
      const insertedOrderData = await placeOrderInSupabase(
        finalUserId, // Always associate with the profile ID
        customerName, 
        cart as CartItem[], 
        cartTotal, 
        tableNumberInput
      );

      if (!insertedOrderData) {
        console.error("Failed to insert order in Supabase");
        toast.error("Failed to place order. Please try again.");
        return null;
      }

      console.log("Order inserted in Supabase:", insertedOrderData);

      const newOrderForLocalState: Order = {
        id: insertedOrderData.id,
        user_id: insertedOrderData.user_id,
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
      
      if (!adminContext) {
        setOrders(prevOrders => [newOrderForLocalState, ...prevOrders]);
      }
      
      clearCart();
      toast.success(`Order #${insertedOrderData.id} placed successfully!`);
      
      return newOrderForLocalState;
    } catch (error) {
      console.error('Error in placeOrder:', error);
      toast.error("Failed to place order. Please try again.");
      return null;
    }
  };

  return { placeOrder };
}
