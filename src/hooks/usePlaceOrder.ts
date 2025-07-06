
import React from 'react';
import { useCartContext } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, placeOrderInSupabase } from '@/services/orderService';
import { Address, Order, OrderStatus } from '@/types/supabaseTypes';
import { toast } from 'sonner';
import { getGuestSession, hasGuestSession } from '@/utils/guestSession';

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
    // Keep existing logic to determine finalUserId and customerName
    let finalUserId = adminContext?.customerId || userId;
    let customerName = adminContext?.customerName;
    
    // Introduce guestUserId/guestFirstName/stayId variables when hasGuestSession() is true and adminContext not provided
    let guestUserId = null;
    let guestFirstName = null;
    let stayId = null;
    
    if (hasGuestSession() && !adminContext) {
      const guestSession = getGuestSession();
      if (guestSession) {
        guestUserId = guestSession.guest_user_id;
        guestFirstName = guestSession.guest_first_name;
        stayId = guestSession.guest_stay_id;
        // For guests, we DON'T set finalUserId - it should remain null
        // The guest info goes in separate guest fields
        
        // Use guest first name if no customerName provided
        if (!customerName) {
          customerName = guestFirstName;
        }
      }
    }
    
    // For guests: finalUserId will be null, but we need guestUserId
    // For regular users: finalUserId should be set
    if (!finalUserId && !guestUserId) {
      console.error('User must be logged in or have guest session to place an order');
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
      
      // For hotel guests, skip profile lookup since they don't have profiles
      let profile = null;
      if (!hasGuestSession() || adminContext) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', finalUserId)
          .single();
        
        if (profileError) {
          console.error("Error fetching profile for order:", profileError);
        } else {
          profile = profileData;
        }
      }
      
      // Use the customerName we determined earlier, or fall back to profile name
      const finalCustomerName = customerName || profile?.name || null;
      console.log("Customer profile found:", profile);
      
      const insertedOrderData = await placeOrderInSupabase({
        userId: guestUserId ? null : finalUserId, // null for guests, actual userId for regular users
        guestUserId,
        guestFirstName,
        stayId,
        customerName: finalCustomerName,
        cartItems: cart as CartItem[],
        total: cartTotal,
        tableNumber: tableNumberInput
      });

      if (!insertedOrderData) {
        console.error("Failed to insert order in Supabase");
        toast.error("Failed to place order. Please try again.");
        return null;
      }

      console.log("Order inserted in Supabase:", insertedOrderData);

      const newOrderForLocalState: Order = {
        id: insertedOrderData.id,
        user_id: insertedOrderData.user_id,
        guest_user_id: insertedOrderData.guest_user_id,
        guest_first_name: insertedOrderData.guest_first_name,
        stay_id: insertedOrderData.stay_id,
        total_amount: insertedOrderData.total_amount,
        order_status: 'new' as OrderStatus,
        created_at: insertedOrderData.created_at,
        updated_at: insertedOrderData.updated_at,
        order_items: insertedOrderData.order_items,
        table_number: insertedOrderData.table_number || tableNumberInput,
        customer_name: insertedOrderData.customer_name,
        customer_name_from_profile: finalCustomerName,
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
