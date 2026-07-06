import { Order } from '@/types/supabaseTypes';

export function normalizeStayId(stayId: string | null | undefined): string {
  return (stayId || '').trim().replace(/[\s_]+/g, '_').toUpperCase();
}

export function stayIdsMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = normalizeStayId(left);
  const normalizedRight = normalizeStayId(right);

  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

export function getStayIdLookupVariants(stayId: string): string[] {
  const trimmed = stayId.trim();
  if (!trimmed) return [];

  const underscored = trimmed.replace(/\s+/g, '_');
  const spaced = trimmed.replace(/_+/g, ' ');

  return Array.from(new Set([
    trimmed,
    underscored,
    spaced,
    underscored.toUpperCase(),
    spaced.toUpperCase(),
  ].filter(Boolean)));
}

export function mergeGuestOrderResults(...orderGroups: Array<Order[] | null | undefined>): Order[] {
  const ordersById = new Map<string | number, Order>();

  orderGroups.flatMap((orders) => orders || []).forEach((order) => {
    ordersById.set(order.id, order);
  });

  return Array.from(ordersById.values()).sort((left, right) => (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  ));
}
