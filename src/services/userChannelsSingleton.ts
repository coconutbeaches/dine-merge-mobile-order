import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { unsubscribeChannel } from '@/utils/supabaseChannelCleanup';

type ChannelSubscriber = (payload: any) => void;

interface ChannelManager {
  channel: RealtimeChannel;
  subscribers: Set<ChannelSubscriber>;
  isSubscribed: boolean;
}

const userChannelManagers = new Map<string, ChannelManager>();

/**
 * Gets or creates a singleton channel for a specific user's orders.
 * This prevents opening multiple WebSocket connections for the same user across different components.
 */
export const getUserOrdersChannel = (userId: string) => {
  // Get or create the manager for this specific user ID
  if (!userChannelManagers.has(userId)) {
    console.log(`[UserChannels] Creating new channel manager for user: ${userId}`);
    const newChannel = supabase.channel(`orders-${userId}-row-level`);
    userChannelManagers.set(userId, {
      channel: newChannel,
      subscribers: new Set(),
      isSubscribed: false,
    });
  }

  const manager = userChannelManagers.get(userId)!;

  return {
    /**
     * Subscribe to real-time order changes for this user.
     */
    subscribe: (callback: ChannelSubscriber) => {
      manager.subscribers.add(callback);
      console.log(`[UserChannels] User ${userId}: Added subscriber. Total: ${manager.subscribers.size}`);

      // Set up the channel subscription if this is the first subscriber for this user
      if (!manager.isSubscribed) {
        console.log(`[UserChannels] User ${userId}: Setting up real-time listeners`);

        manager.channel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
            (payload) => {
              console.log(`[UserChannels] User ${userId}: Broadcasting to ${manager.subscribers.size} subscribers`);
              manager.subscribers.forEach(subscriber => {
                try {
                  subscriber(payload);
                } catch (error) {
                  console.error(`[UserChannels] User ${userId}: Error in subscriber callback:`, error);
                }
              });
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[UserChannels] Successfully subscribed to channel for user ${userId}`);
                manager.isSubscribed = true;
            }
            if (status === 'CHANNEL_ERROR') {
                console.error(`[UserChannels] Channel error for user ${userId}:`, err);
            }
            if (status === 'TIMED_OUT') {
                console.error(`[UserChannels] Channel timed out for user ${userId}`);
            }
          });
      }

      // Return an unsubscribe function
      return () => {
        manager.subscribers.delete(callback);
        console.log(`[UserChannels] User ${userId}: Removed subscriber. Total: ${manager.subscribers.size}`);

        // If no more subscribers, clean up the channel for this user
        if (manager.subscribers.size === 0) {
          console.log(`[UserChannels] User ${userId}: No more subscribers, cleaning up channel.`);
          unsubscribeChannel(manager.channel.topic);
          userChannelManagers.delete(userId);
        }
      };
    },

    /**
     * Get the current number of active subscribers for this user's channel.
     */
    getSubscriberCount: () => manager.subscribers.size,

    /**
     * Check if the channel for this user is currently active.
     */
    isActive: () => manager.isSubscribed && manager.subscribers.size > 0,
  };
};

/**
 * Cleanup function for testing or manual cleanup of all user channels.
 */
export const cleanupAllUserChannels = () => {
  userChannelManagers.forEach((manager, userId) => {
    unsubscribeChannel(manager.channel.topic);
    console.log(`[UserChannels] Manually cleaned up channel for user ${userId}`);
  });
  userChannelManagers.clear();
  console.log('[UserChannels] Manual cleanup of all user channels completed');
};
