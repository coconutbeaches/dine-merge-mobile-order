import { describe, expect, it } from 'vitest';
import { Order } from '@/types/supabaseTypes';
import { summarizeOrderHistory } from './order-history-summary';

function order(id: number, status: Order['order_status'], total: number): Order {
  return {
    id,
    order_status: status,
    total_amount: total,
  } as Order;
}

describe('summarizeOrderHistory', () => {
  it('excludes cancelled amounts and counts while leaving history visible', () => {
    const visibleOrders = [
      order(1, 'cancelled', 100),
      order(2, 'new', 25),
    ];

    const summary = summarizeOrderHistory(visibleOrders);

    expect(summary.totalSpent).toBe(25);
    expect(summary.billableCount).toBe(1);
    expect(summary.billableOrders.map(({ id }) => id)).toEqual([2]);
    expect(visibleOrders.map(({ id }) => id)).toEqual([1, 2]);
  });

  it('includes paid, preparing, completed, and other non-cancelled orders', () => {
    const summary = summarizeOrderHistory([
      order(1, 'paid', 10),
      order(2, 'preparing', 20),
      order(3, 'completed', 30),
      order(4, 'ready', 40),
      order(5, 'out_for_delivery', 50),
      order(6, 'cancelled', 999),
    ]);

    expect(summary.totalSpent).toBe(150);
    expect(summary.billableCount).toBe(5);
  });
});
