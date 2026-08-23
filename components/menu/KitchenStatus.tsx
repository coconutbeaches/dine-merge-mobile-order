"use client";

import { useEffect, useRef, useState } from 'react';
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
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);

  const { data } = useQuery({
    queryKey: ['public-kitchen-status'],
    queryFn: fetchKitchenStatus,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const activeOrders = Math.max(0, data?.active_orders ?? 0);
  const oldestWaitMinutes =
    data?.oldest_wait_minutes == null
      ? null
      : Math.max(0, data.oldest_wait_minutes);
  const shouldShow =
    activeOrders > 0 && oldestWaitMinutes !== null && oldestWaitMinutes > 5;

  useEffect(() => {
    if (!shouldShow || dismissed) {
      setIsVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [shouldShow, dismissed]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  if (!data || !shouldShow || dismissed) return null;

  const dismiss = () => {
    setIsVisible(false);
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = window.setTimeout(() => setDismissed(true), 300);
  };

  const orderCopy =
    activeOrders === 1
      ? 'There is 1 order ahead of you'
      : `There are ${activeOrders} orders ahead of you`;
  const minuteCopy = oldestWaitMinutes === 1 ? 'minute' : 'minutes';

  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label="Dismiss kitchen queue status"
      aria-live="polite"
      className={`fixed left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-black px-5 py-4 text-left text-white shadow-xl transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-[calc(100%+2rem)] opacity-0'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
    >
      <span className="block text-base font-semibold leading-snug">{orderCopy}</span>
      <span className="mt-1 block text-sm leading-snug text-white/80">
        The oldest order was placed{' '}
        <span className="font-semibold text-white">
          {oldestWaitMinutes} {minuteCopy} ago
        </span>
      </span>
    </button>
  );
}
