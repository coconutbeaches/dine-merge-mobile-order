
import React from 'react';
import { useCartContext } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, placeOrderInSupabase } from '@/services/orderService';
import { Address, Order, OrderStatus } from '@/types/supabaseTypes';
import { toast } from 'sonner';
import { getGuestSession, hasGuestSession, getTableNumber } from '@/utils/guestSession';
import { clearCartBackup } from '@/lib/cartService';

export function usePlaceOrder(
  userId: string | undefined,
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
) {
  const { cart, cartTotal, clearCart } = useCartContext();

  const placeOrder = async (
    address: Address | null, 
    paymentMethod: string, 
    providedTableNumber = 'Take Away',
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
    
    // Handle admin context with hotel guests
    if (adminContext && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminContext.customerId)) {
      // This is a hotel guest (stay_id), not a regular user
      stayId = adminContext.customerId;
      finalUserId = null; // Don't set user_id for hotel guests
    }
    
    // For guests: finalUserId will be null, but we need guestUserId or stayId
    // For regular users: finalUserId should be set
    if (!finalUserId && !guestUserId && !stayId) {
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
        providedTableNumber,
        adminContext
      });
      
      // Optimize profile lookup - skip if we already have customer name in admin context
      let profile = null;
      
      // Only fetch profile if:
      // 1. We don't already have customerName from admin context, AND
      // 2. Not a guest session, OR admin context with a UUID (regular user)
      const shouldFetchProfile = !customerName && !hasGuestSession() && (!adminContext || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminContext.customerId));
      
      if (shouldFetchProfile) {
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
      
      // Get guest session and context for merging according to specification
      const guestSession = getGuestSession();
      const guestCtx = { tableNumber: typeof window !== 'undefined' ? getTableNumber() : null };
      
      const insertedOrderData = await placeOrderInSupabase({
        userId: adminContext ? 
          // Admin creating order: use customer ID if it's a UUID, null if hotel guest
          (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminContext.customerId) ? adminContext.customerId : null) :
          // Regular user/guest: null for guests, userId for regular users
          ((guestUserId || stayId) ? null : finalUserId),
        // Merge according to specification:
        // guestUserId: guestSession?.guest_user_id
        // guestFirstName: guestSession?.guest_first_name
        guestUserId: adminContext ? null : guestSession?.guest_user_id,
        guestFirstName: adminContext ? null : guestSession?.guest_first_name,
        stayId: adminContext ? 
          // Admin creating order: use stay_id if customer is hotel guest, null otherwise
          (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(adminContext.customerId) ? null : adminContext.customerId) :
          // Regular guest: use their stay_id
          stayId,
        customerName: finalCustomerName,
        cartItems: cart as CartItem[],
        total: cartTotal,
        // Merge according to specification:
        // tableNumber: providedTableNumber || guestCtx.tableNumber || undefined
        tableNumber: providedTableNumber || guestCtx.tableNumber || undefined
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
        table_number: insertedOrderData.table_number || providedTableNumber,
        customer_name: insertedOrderData.customer_name,
        customer_name_from_profile: finalCustomerName,
        customer_email_from_profile: profile?.email || null
      };
      
      console.log("New order created for local state:", newOrderForLocalState);
      
      if (!adminContext) {
        setOrders(prevOrders => [newOrderForLocalState, ...prevOrders]);
      }
      
      clearCart();
      if (hasGuestSession()) {
        const guestId = getGuestSession()?.guest_user_id;
        clearCartBackup(guestId);
      }
      toast.success(`Order #${insertedOrderData.id} placed successfully!`);
      
      return newOrderForLocalState;
    } catch (error) {
      console.error('Error in placeOrder:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error("Failed to place order. Please try again.");
      return null;
    }
  };

  return { placeOrder };
}
