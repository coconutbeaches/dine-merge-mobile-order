
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

    let customerName: string | null = null;
    let customerEmail: string | null = null;

    let profileData: { name: string | null; email: string | null } | null = null;
    let guestProfileData: { first_name: string | null } | null = null;

    // Try to fetch guest user first
    if (finalUserId.includes('-') && finalUserId.includes('_')) { // Heuristic for guest user_id format (e.g., A5-CROWLEY_tyrone)
      const { data: guestData, error: guestError } = await supabase
        .from('guest_users')
        .select('first_name')
        .eq('auth_user_id', finalUserId)
        .maybeSingle();

      if (guestData) {
        guestProfileData = guestData;
        customerName = guestData.first_name;
        customerEmail = null; // Guest users don't have emails in this setup
      } else if (guestError) {
        console.warn('Guest user not found or error fetching guest profile:', guestError.message);
        // Fallback to regular profile fetch if guest user not found
      }
    }

    // If not a guest user or guest user not found, try fetching from profiles table
    if (!customerName) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', finalUserId)
        .maybeSingle();
      
      if (profile) {
        profileData = profile;
        customerName = profile.name;
        customerEmail = profile.email;
      } else if (profileError) {
        console.error("Error fetching profile for order:", profileError);
      }
    }

    // If still no customer name, use a fallback
    if (!customerName) {
      customerName = 'Unknown Customer';
    }

    try {
      console.log("useOrders: Placing order with:", { 
        userId: finalUserId, 
        address, 
        paymentMethod, 
        cart: cart.length, 
        tableNumberInput,
        adminContext,
        customerName, // Log resolved customer name
        customerEmail // Log resolved customer email
      });
      
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
        customer_email_from_profile: customerEmail
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
