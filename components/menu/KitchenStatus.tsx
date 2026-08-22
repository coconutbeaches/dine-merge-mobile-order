"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type KitchenStatusRow = {
  active_orders: number | null;
  oldest_wait_minutes: number | null;
};

async function fetchKitchenStatus(): Promise<KitchenStatusRow | null> {
  const { data, error } = await (supabase as any).rpc('get_public_kitchen_status');

  if (error) {
    console.warn('[KitchenStatus] Unable to load kitchen status:', error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    active_orders: Number(row.active_orders ?? 0),
    oldest_wait_minutes:
      row.oldest_wait_minutes == null ? null : Number(row.oldest_wait_minutes),
  };
}

export default function KitchenStatus() {
  const { data } = useQuery({
    queryKey: ['public-kitchen-status'],
    queryFn: fetchKitchenStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (!data) return null;

  const activeOrders = Math.max(0, data.active_orders ?? 0);
  const oldestWaitMinutes =
    data.oldest_wait_minutes == null
      ? null
      : Math.max(0, data.oldest_wait_minutes);

  return (
    <div className="mb-5 text-center text-sm text-gray-600" aria-live="polite">
      <span className="font-medium text-gray-700">Kitchen status:</span>{' '}
      {activeOrders} active {activeOrders === 1 ? 'order' : 'orders'}
      {activeOrders > 0 && oldestWaitMinutes !== null && (
        <> · oldest waiting {oldestWaitMinutes} min</>
      )}
    </div>
  );
}
