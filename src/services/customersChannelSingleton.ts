import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { unsubscribeChannel } from '@/utils/supabaseChannelCleanup';

type ChannelSubscriber = (payload: any) => void;

interface ChannelManager {
  channel: RealtimeChannel | null;
  subscribers: Set<ChannelSubscriber>;
  isSubscribed: boolean;
}

let customersChannelManager: ChannelManager = {
  channel: null,
  subscribers: new Set(),
  isSubscribed: false,
};

/**
 * Gets or creates a singleton customers channel for real-time updates.
 * Multiple hooks can subscribe to the same channel to avoid opening multiple connections.
 * Specifically listens to order INSERTs to update customer total_spent locally.
 */
export const getCustomersChannel = () => {
  if (!customersChannelManager.channel) {
    console.log('[CustomersChannel] Creating new singleton channel');
    customersChannelManager.channel = supabase.channel('customers-optimized-singleton');
    customersChannelManager.isSubscribed = false;
  }

  return {
    /**
     * Subscribe to real-time order changes that affect customer total_spent
     */
    subscribe: (callback: ChannelSubscriber) => {
      customersChannelManager.subscribers.add(callback);
      console.log(`[CustomersChannel] Added subscriber. Total: ${customersChannelManager.subscribers.size}`);

      // Set up the channel if this is the first subscriber
      if (!customersChannelManager.isSubscribed && customersChannelManager.channel) {
        console.log('[CustomersChannel] Setting up real-time listeners for order INSERTs');
        
        customersChannelManager.channel
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => {
              console.log(`[CustomersChannel] Order INSERT detected, broadcasting to ${customersChannelManager.subscribers.size} subscribers`);
              console.log('[CustomersChannel] Order payload:', payload.new);
              
              customersChannelManager.subscribers.forEach(subscriber => {
                try {
                  subscriber(payload);
                } catch (error) {
                  console.error('[CustomersChannel] Error in subscriber callback:', error);
                }
              });
            }
          )
          .subscribe();
        
        customersChannelManager.isSubscribed = true;
      }

      // Return unsubscribe function
      return () => {
        customersChannelManager.subscribers.delete(callback);
        console.log(`[CustomersChannel] Removed subscriber. Total: ${customersChannelManager.subscribers.size}`);

        // Clean up the channel if no more subscribers
        if (customersChannelManager.subscribers.size === 0 && customersChannelManager.channel) {
          console.log('[CustomersChannel] No more subscribers, cleaning up channel');
          unsubscribeChannel('customers-optimized-singleton');
          customersChannelManager.channel = null;
          customersChannelManager.isSubscribed = false;
        }
      };
    },

    /**
     * Get the current number of active subscribers
     */
    getSubscriberCount: () => customersChannelManager.subscribers.size,

    /**
     * Check if the channel is currently active
     */
    isActive: () => customersChannelManager.isSubscribed && customersChannelManager.subscribers.size > 0,
  };
};

/**
 * Cleanup function for testing or manual cleanup
 */
export const cleanupCustomersChannel = () => {
  if (customersChannelManager.channel) {
    unsubscribeChannel('customers-optimized-singleton');
  }
  customersChannelManager = {
    channel: null,
    subscribers: new Set(),
    isSubscribed: false,
  };
  console.log('[CustomersChannel] Manual cleanup completed');
};
