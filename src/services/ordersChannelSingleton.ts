import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { unsubscribeChannel } from '@/utils/supabaseChannelCleanup';

type ChannelSubscriber = (payload: any) => void;

interface ChannelManager {
  channel: RealtimeChannel | null;
  subscribers: Set<ChannelSubscriber>;
  isSubscribed: boolean;
}

let ordersChannelManager: ChannelManager = {
  channel: null,
  subscribers: new Set(),
  isSubscribed: false,
};

/**
 * Gets or creates a singleton orders channel for real-time updates.
 * Multiple hooks can subscribe to the same channel to avoid opening multiple connections.
 */
export const getOrdersChannel = () => {
  if (!ordersChannelManager.channel) {
    console.log('[OrdersChannel] Creating new singleton channel');
    ordersChannelManager.channel = supabase.channel('orders-optimized-singleton');
    ordersChannelManager.isSubscribed = false;
  }

  return {
    /**
     * Subscribe to real-time order changes
     */
    subscribe: (callback: ChannelSubscriber) => {
      ordersChannelManager.subscribers.add(callback);
      console.log(`[OrdersChannel] Added subscriber. Total: ${ordersChannelManager.subscribers.size}`);

      // Set up the channel if this is the first subscriber
      if (!ordersChannelManager.isSubscribed && ordersChannelManager.channel) {
        console.log('[OrdersChannel] Setting up real-time listeners');
        
        ordersChannelManager.channel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders' },
            (payload) => {
              console.log(`[OrdersChannel] Broadcasting to ${ordersChannelManager.subscribers.size} subscribers`);
              ordersChannelManager.subscribers.forEach(subscriber => {
                try {
                  subscriber(payload);
                } catch (error) {
                  console.error('[OrdersChannel] Error in subscriber callback:', error);
                }
              });
            }
          )
          .subscribe();
        
        ordersChannelManager.isSubscribed = true;
      }

      // Return unsubscribe function
      return () => {
        ordersChannelManager.subscribers.delete(callback);
        console.log(`[OrdersChannel] Removed subscriber. Total: ${ordersChannelManager.subscribers.size}`);

        // Clean up the channel if no more subscribers
        if (ordersChannelManager.subscribers.size === 0 && ordersChannelManager.channel) {
          console.log('[OrdersChannel] No more subscribers, cleaning up channel');
          unsubscribeChannel('orders-optimized-singleton');
          ordersChannelManager.channel = null;
          ordersChannelManager.isSubscribed = false;
        }
      };
    },

    /**
     * Get the current number of active subscribers
     */
    getSubscriberCount: () => ordersChannelManager.subscribers.size,

    /**
     * Check if the channel is currently active
     */
    isActive: () => ordersChannelManager.isSubscribed && ordersChannelManager.subscribers.size > 0,
  };
};

/**
 * Cleanup function for testing or manual cleanup
 */
export const cleanupOrdersChannel = () => {
  if (ordersChannelManager.channel) {
    unsubscribeChannel('orders-optimized-singleton');
  }
  ordersChannelManager = {
    channel: null,
    subscribers: new Set(),
    isSubscribed: false,
  };
  console.log('[OrdersChannel] Manual cleanup completed');
};
