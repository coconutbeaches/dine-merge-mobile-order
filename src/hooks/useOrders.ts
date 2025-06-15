
import { getFilteredOrderHistory } from '@/services/orderService';
import { useUserOrders } from './useUserOrders';
import { usePlaceOrder } from './usePlaceOrder';

export function useOrders(userId: string | undefined) {
  const { orders, setOrders, isLoading, loadUserOrders } = useUserOrders(userId);
  const { placeOrder } = usePlaceOrder(userId, setOrders);

  const getOrderHistory = () => {
    return getFilteredOrderHistory(orders, userId);
  };

  return {
    orders,
    isLoading,
    placeOrder,
    getOrderHistory,
    loadUserOrders,
  };
}
