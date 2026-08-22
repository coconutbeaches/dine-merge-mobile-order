import { Order } from '@/types/supabaseTypes';

export interface OrderHistorySummary {
  billableOrders: Order[];
  totalSpent: number;
  billableCount: number;
}

export function summarizeOrderHistory(orders: Order[]): OrderHistorySummary {
  const billableOrders = orders.filter((order) => order.order_status !== 'cancelled');

  return {
    billableOrders,
    totalSpent: billableOrders.reduce(
      (total, order) => total + Number(order.total_amount ?? 0),
      0
    ),
    billableCount: billableOrders.length,
  };
}
