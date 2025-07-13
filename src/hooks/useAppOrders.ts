
import { useOrders } from '@/hooks/useOrders';
import { Address, Order } from '@/types/supabaseTypes';

export function useAppOrders(
  effectiveUserId: string | undefined,
  adminCustomerContext: { customerId: string; customerName: string } | null,
  currentUser: any
) {
  const { placeOrder, getOrderHistory } = useOrders(effectiveUserId);

  // Enhanced order placement function with admin context logic
  const handlePlaceOrder = async (
    address: Address | null,
    paymentMethod: string,
    tableNumber?: string
  ): Promise<Order | null> => {
    try {
      console.log("🔍 DEBUGGING: AppContext adminCustomerContext:", adminCustomerContext);
      console.log("🔍 DEBUGGING: Current user ID:", currentUser?.id);
      console.log("🔍 DEBUGGING: Effective user ID:", effectiveUserId);
      
      console.log("AppContext: Placing order with:", {
        effectiveUserId,
        adminContext: adminCustomerContext,
        currentUserId: currentUser?.id,
        address,
        paymentMethod,
        tableNumber
      });

      const result = await placeOrder(address, paymentMethod, tableNumber, adminCustomerContext);
      console.log("AppContext: Order placement result:", result);
      return result;
    } catch (error) {
      console.error("AppContext: Error placing order:", error);
      return null;
    }
  };

  return {
    placeOrder: handlePlaceOrder,
    getOrderHistory,
  };
}
